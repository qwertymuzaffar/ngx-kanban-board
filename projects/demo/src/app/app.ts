import { Component, signal } from '@angular/core';
import { KanbanBoardComponent, KanbanColumn, CardAddedEvent, CardMovedEvent, ColumnRenamedEvent } from 'ngx-kanban-board';

@Component({
  selector: 'app-root',
  imports: [KanbanBoardComponent],
  template: `
    <header class="hero">
      <div>
        <h1>ngx-kanban-board</h1>
        <p>Drag-and-drop kanban for Angular - CDK-based, signals API, WIP limits, CSS-variable theming</p>
      </div>
      <div class="last-event">{{ lastEvent() }}</div>
    </header>
    <main>
      <ngx-kanban-board
        [columns]="columns"
        [showAddColumn]="true"
        [editableTitles]="true"
        [showAddCard]="true"
        (cardMoved)="onMoved($event)"
        (columnRenamed)="onRenamed($event)"
        (addColumnRequested)="onAddColumn()"
        (cardAdded)="onCardAdded($event)"
      />
    </main>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; font-family: -apple-system, 'Segoe UI', sans-serif; }
    .hero {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 24px; background: #1e293b; color: #fff;
    }
    h1 { margin: 0; font-size: 20px; }
    .hero p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .last-event { font-size: 12px; color: #7ee787; font-family: ui-monospace, monospace; }
    main { flex: 1; overflow: hidden; }
    ngx-kanban-board { height: 100%; }
  `,
})
export class App {
  readonly lastEvent = signal('drag a card to see events');

  readonly columns: KanbanColumn[] = [
    {
      id: 'backlog',
      title: 'Backlog',
      color: '#94a3b8',
      cards: [
        { id: 'c1', title: 'Design onboarding flow', tags: ['design'], color: '#8b5cf6' },
        { id: 'c2', title: 'Spike: virtual scrolling for 1k cards', description: 'Evaluate CDK virtual scroll inside drop lists.', tags: ['research'] },
        { id: 'c3', title: 'Accessibility audit', tags: ['a11y'] },
      ],
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      color: '#3b82f6',
      wipLimit: 3,
      cards: [
        { id: 'c4', title: 'Keyboard drag-and-drop', description: 'Arrow keys + space to lift and drop cards.', tags: ['a11y', 'core'], color: '#3b82f6' },
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

  private readonly palette = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
  private added = 0;

  onMoved(e: CardMovedEvent): void {
    this.lastEvent.set(`cardMoved: "${e.card.title}" ${e.fromColumnId} -> ${e.toColumnId}[${e.toIndex}]`);
  }

  onRenamed(e: ColumnRenamedEvent): void {
    this.lastEvent.set(`columnRenamed: "${e.previousTitle}" -> "${e.title}"`);
  }

  onCardAdded(e: CardAddedEvent): void {
    this.lastEvent.set(`cardAdded: "${e.card.title}" -> ${e.columnId}`);
  }

  onAddColumn(): void {
    this.added++;
    this.columns.push({
      id: `col-${this.added}`,
      title: `New Column ${this.added}`,
      color: this.palette[(this.added - 1) % this.palette.length],
      cards: [],
    });
    this.lastEvent.set(`addColumnRequested -> created "New Column ${this.added}"`);
  }
}
