import { within, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useRoute } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import SourceControlPushModal from '@/components/SourceControlPushModal.ee.vue';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import type { SourceControlledFile } from '@n8n/api-types';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';
import { useTelemetry } from '@/composables/useTelemetry';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectListItem } from '@/types/projects.types';

const eventBus = createEventBus();

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: vi.fn(),
		params: vi.fn(),
		fullPath: vi.fn(),
	}),
	RouterLink: vi.fn(),
	useRouter: vi.fn(),
}));

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

let route: ReturnType<typeof useRoute>;
let telemetry: ReturnType<typeof useTelemetry>;

const DynamicScrollerStub = {
	props: {
		items: Array,
	},
	template: '<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
	methods: {
		scrollToItem: vi.fn(),
	},
};

const DynamicScrollerItemStub = {
	template: '<slot></slot>',
};

const projects = [
	{
		id: '1',
		name: 'Nathan member',
		type: 'personal',
	},
	{
		id: '2',
		name: 'Other project',
		type: 'team',
	},
] as const;

const renderModal = createComponentRenderer(SourceControlPushModal, {
	global: {
		stubs: {
			DynamicScroller: DynamicScrollerStub,
			DynamicScrollerItem: DynamicScrollerItemStub,
			Modal: {
				template: `
					<div>
						<slot name="header" />
						<slot name="title" />
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

describe('SourceControlPushModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route = useRoute();
		telemetry = useTelemetry();
		createTestingPinia();
	});

	it('mounts', () => {
		vi.spyOn(route, 'fullPath', 'get').mockReturnValue('');

		const { getByText } = renderModal({
			pinia: createTestingPinia(),
			props: {
				data: {
					eventBus,
					status: [],
				},
			},
		});
		expect(getByText('Commit and push changes')).toBeInTheDocument();
	});

	it('should toggle checkboxes', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'My workflow 1',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My workflow 2',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
		];

		const { getByTestId, getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const files = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(files).toHaveLength(2);

		await userEvent.click(files[0]);
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[0]).getByRole('checkbox'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[1]).getByRole('checkbox'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(files[1]);
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(getByTestId('source-control-push-modal-toggle-all'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();
		expect(
			within(getByTestId('source-control-push-modal-toggle-all')).getByRole('checkbox'),
		).not.toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();
		expect(
			within(getByTestId('source-control-push-modal-toggle-all')).getByRole('checkbox'),
		).toBeChecked();

		await userEvent.click(getByTestId('source-control-push-modal-toggle-all'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();
	});

	it('should push all entities besides workflows and credentials', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'credential',
				type: 'credential',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'variables',
				type: 'variables',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
			{
				id: 'mappings',
				name: 'tags',
				type: 'tags',
				status: 'modified',
				location: 'local',
				conflict: false,
				file: '/Users/raul/.n8n/git/tags.json',
				updatedAt: '2024-12-04T11:29:22.095Z',
			},
			{
				id: 'mappings',
				name: 'folders',
				type: 'folders',
				status: 'modified',
				location: 'local',
				conflict: false,
				file: '/Users/raul/.n8n/git/folders.json',
				updatedAt: '2024-12-04T11:29:22.095Z',
			},
		];

		const sourceControlStore = mockedStore(useSourceControlStore);

		const { getByTestId, getByRole } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const submitButton = getByTestId('source-control-push-modal-submit');
		const commitMessage = 'commit message';
		expect(submitButton).toBeDisabled();

		expect(getByRole('alert').textContent).toContain(
			[
				'Changes to variables, tags and folders',
				'Variables : at least one new or modified.',
				'Tags : at least one new or modified.',
				'Folders : at least one new or modified. ',
			].join(' '),
		);

		await userEvent.type(getByTestId('source-control-push-modal-commit'), commitMessage);

		expect(submitButton).not.toBeDisabled();
		await userEvent.click(submitButton);

		expect(sourceControlStore.pushWorkfolder).toHaveBeenCalledWith(
			expect.objectContaining({
				commitMessage,
				fileNames: expect.arrayContaining(status.filter((file) => file.type !== 'credential')),
				force: true,
			}),
		);
	});

	it('should auto select currentWorkflow', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'My workflow 1',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My workflow 2',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
		];

		vi.spyOn(route, 'name', 'get').mockReturnValue(VIEWS.WORKFLOW);
		vi.spyOn(route, 'params', 'get').mockReturnValue({ name: 'gTbbBkkYTnNyX1jD' });

		const { getByTestId, getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const submitButton = getByTestId('source-control-push-modal-submit');
		expect(submitButton).toBeDisabled();

		const files = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(files).toHaveLength(2);

		await waitFor(() => expect(within(files[0]).getByRole('checkbox')).toBeChecked());
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.type(getByTestId('source-control-push-modal-commit'), 'message');
		expect(submitButton).not.toBeDisabled();
	});

	it('should show credentials in a different tab', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'My workflow 1',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My workflow 2',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My credential',
				type: 'credential',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
		];

		const { getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const workflows = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(workflows).toHaveLength(2);

		const tab = getAllByTestId('source-control-push-modal-tab').filter(({ textContent }) =>
			textContent?.includes('Credentials'),
		);

		await userEvent.click(tab[0]);

		const credentials = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(credentials).toHaveLength(1);
		expect(within(credentials[0]).getByText('My credential')).toBeInTheDocument();
	});

	describe('filters', () => {
		it('should filter by name', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'My workflow 1',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'My workflow 2',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(2);

			await userEvent.type(getByTestId('source-control-push-search'), '1');
			await waitFor(() => {
				expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(1);
				expect(telemetry.track).toHaveBeenCalledWith('User searched workflows in commit modal', {
					search: '1',
				});
			});
		});

		it('should filter by status', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'Created Workflow',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'Modified workflow',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(2);

			await userEvent.click(getByTestId('source-control-filter-dropdown'));

			expect(getByTestId('source-control-status-filter')).toBeVisible();

			await userEvent.click(
				within(getByTestId('source-control-status-filter')).getByRole('combobox'),
			);

			await waitFor(() =>
				expect(getAllByTestId('source-control-status-filter-option')[0]).toBeVisible(),
			);

			const menu = getAllByTestId('source-control-status-filter-option')[0]
				.parentElement as HTMLElement;

			await userEvent.click(within(menu).getByText('New'));
			await waitFor(() => {
				const items = getAllByTestId('source-control-push-modal-file-checkbox');
				expect(items).toHaveLength(1);
				expect(items[0]).toHaveTextContent('Created Workflow');
				expect(telemetry.track).toHaveBeenCalledWith('User filtered by status in commit modal', {
					status: 'created',
				});
			});
		});

		test.each([
			['credential', 'Credentials'],
			['workflow', 'Workflows'],
		])('should filter %s by project', async (entity, name) => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.availableProjects = projects as unknown as ProjectListItem[];

			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: `My ${name} 1`,
					type: entity as SourceControlledFile['type'],
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
					owner: {
						type: projects[0].type,
						projectId: projects[0].id,
						projectName: projects[0].name as string,
					},
				},
				{
					id: 'JIGKevgZagmJAnM6',
					name: `My ${name} 1`,
					type: entity as SourceControlledFile['type'],
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
					owner: {
						type: projects[1].type,
						projectId: projects[1].id,
						projectName: projects[1].name as string,
					},
				},
			];

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const tab = getAllByTestId('source-control-push-modal-tab').filter(({ textContent }) =>
				textContent?.includes(name),
			);

			await userEvent.click(tab[0]);

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(2);

			await userEvent.click(getByTestId('source-control-filter-dropdown'));

			expect(getByTestId('source-control-push-modal-project-search')).toBeVisible();

			await userEvent.click(getByTestId('source-control-push-modal-project-search'));

			expect(getAllByTestId('project-sharing-info')).toHaveLength(2);

			await userEvent.click(getAllByTestId('project-sharing-info')[0]);

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(1);
			expect(getByTestId('source-control-push-modal-file-checkbox')).toHaveTextContent(
				`My ${name} 1`,
			);
		});

		it('should reset', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'Modified workflow',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId, queryAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(1);

			await userEvent.click(getByTestId('source-control-filter-dropdown'));

			expect(getByTestId('source-control-status-filter')).toBeVisible();

			await userEvent.click(
				within(getByTestId('source-control-status-filter')).getByRole('combobox'),
			);

			await waitFor(() =>
				expect(getAllByTestId('source-control-status-filter-option')[0]).toBeVisible(),
			);

			const menu = getAllByTestId('source-control-status-filter-option')[0]
				.parentElement as HTMLElement;

			await userEvent.click(within(menu).getByText('New'));
			await waitFor(() => {
				expect(queryAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(0);
				expect(getByTestId('source-control-filters-reset')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('source-control-filters-reset'));

			const items = getAllByTestId('source-control-push-modal-file-checkbox');
			expect(items).toHaveLength(1);
		});
	});

	describe('Enter key behavior', () => {
		it('should trigger commit and push when Enter is pressed and submit is enabled', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'variables',
					type: 'variables',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
			];

			const sourceControlStore = mockedStore(useSourceControlStore);

			const { getByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const commitInput = getByTestId('source-control-push-modal-commit');
			const commitMessage = 'Test commit message';

			await userEvent.type(commitInput, commitMessage);

			expect(getByTestId('source-control-push-modal-submit')).not.toBeDisabled();

			await userEvent.type(commitInput, '{enter}');

			expect(sourceControlStore.pushWorkfolder).toHaveBeenCalledWith(
				expect.objectContaining({
					commitMessage,
					fileNames: expect.arrayContaining([status[0]]),
				}),
			);
		});

		it('should not trigger commit when Enter is pressed with empty commit message', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'variables',
					type: 'variables',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
			];

			const sourceControlStore = mockedStore(useSourceControlStore);

			const { getByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const commitInput = getByTestId('source-control-push-modal-commit');

			expect(getByTestId('source-control-push-modal-submit')).toBeDisabled();

			await userEvent.type(commitInput, '{enter}');

			expect(sourceControlStore.pushWorkfolder).not.toHaveBeenCalled();
		});

		it('should not trigger commit when Enter is pressed with no items selected', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'My workflow',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
			];

			const sourceControlStore = mockedStore(useSourceControlStore);

			vi.spyOn(route, 'name', 'get').mockReturnValue('SOME_OTHER_VIEW');
			vi.spyOn(route, 'params', 'get').mockReturnValue({ name: 'differentId' });

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const commitInput = getByTestId('source-control-push-modal-commit');
			const commitMessage = 'Test commit message';

			const files = getAllByTestId('source-control-push-modal-file-checkbox');
			expect(files).toHaveLength(1);
			expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();

			await userEvent.type(commitInput, commitMessage);

			expect(getByTestId('source-control-push-modal-submit')).toBeDisabled();

			await userEvent.type(commitInput, '{enter}');

			expect(sourceControlStore.pushWorkfolder).not.toHaveBeenCalled();
		});
	});
});
