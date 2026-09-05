import type { Meta, StoryObj } from '@storybook/angular';
import { KanbanBoardComponent } from './kanban-board.component';
import type { KanbanColumn } from './kanban.models';

const columns = (): KanbanColumn[] => [
  {
    id: 'backlog',
    title: 'Backlog',
    color: '#94a3b8',
    cards: [
      { id: 'c1', title: 'Design onboarding flow', tags: ['design'], color: '#8b5cf6' },
      {
        id: 'c2',
        title: 'Spike: virtual scrolling for 1k cards',
        description: 'Evaluate CDK virtual scroll inside drop lists.',
        tags: ['research'],
      },
      { id: 'c3', title: 'Accessibility audit', tags: ['a11y'] },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: '#3b82f6',
    wipLimit: 3,
    cards: [
      {
        id: 'c4',
        title: 'Keyboard drag-and-drop',
        description: 'Arrow keys + space to lift and drop cards.',
        tags: ['a11y', 'core'],
        color: '#3b82f6',
      },
      { id: 'c5', title: 'Theming docs', tags: ['docs'] },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    color: '#f59e0b',
    wipLimit: 2,
    cards: [
      { id: 'c6', title: 'WIP limit highlighting', tags: ['core'], color: '#f59e0b' },
      { id: 'c7', title: 'Card templates RFC', description: 'Custom card rendering via ng-template.', tags: ['api'] },
      { id: 'c8', title: 'CI matrix: Angular 19-22', tags: ['infra'] },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#22c55e',
    cards: [
      { id: 'c9', title: 'Project scaffold', tags: ['infra'], color: '#22c55e' },
      { id: 'c10', title: 'Drag preview styling', tags: ['core'] },
    ],
  },
];

const meta: Meta<KanbanBoardComponent> = {
  title: 'Kanban/KanbanBoard',
  component: KanbanBoardComponent,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    cardMoved: { action: 'cardMoved' },
    cardClicked: { action: 'cardClicked' },
    columnsChange: { action: 'columnsChange' },
  },
};
export default meta;

type Story = StoryObj<KanbanBoardComponent>;

/** Four columns, colors, tags, and one column over its WIP limit. */
export const Default: Story = {
  args: { columns: columns() },
};

/** WIP limits: Review is over (3/2 - red badge), In Progress is under. */
export const WipLimitExceeded: Story = {
  args: {
    columns: columns().map((c) =>
      c.id === 'in-progress' ? { ...c, wipLimit: 1 } : c,
    ),
  },
};

/** Read-only board - dragging disabled, e.g. for viewers without edit rights. */
export const ReadOnly: Story = {
  args: { columns: columns(), disabled: true },
};

/** Empty columns render a dashed drop target. */
export const EmptyBoard: Story = {
  args: {
    columns: [
      { id: 'todo', title: 'To Do', cards: [] },
      { id: 'doing', title: 'Doing', wipLimit: 3, cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ],
  },
};

/** Dark theme via CSS custom properties - no inputs, just variables. */
export const DarkTheme: Story = {
  args: { columns: columns() },
  decorators: [
    (story) => ({
      ...story(),
      template: `
        <div style="
          --nkb-bg:#0f172a; --nkb-column-bg:#1e293b; --nkb-card-bg:#273449;
          --nkb-ink:#e2e8f0; --nkb-muted:#94a3b8; --nkb-accent:#38bdf8;
          height:100vh;">
          ${'<ngx-kanban-board [columns]="columns" [disabled]="disabled" />'}
        </div>`,
    }),
  ],
};
