import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { KanbanBoardComponent } from './kanban-board.component';
import type { CardMovedEvent, KanbanCard, KanbanColumn } from './kanban.models';

function makeColumns(): KanbanColumn[] {
  return [
    {
      id: 'todo',
      title: 'To Do',
      cards: [
        { id: 'a', title: 'Task A', tags: ['x'] },
        { id: 'b', title: 'Task B', description: 'desc B' },
      ],
    },
    {
      id: 'doing',
      title: 'Doing',
      wipLimit: 1,
      cards: [
        { id: 'c', title: 'Task C' },
        { id: 'd', title: 'Task D' },
      ],
    },
    { id: 'done', title: 'Done', cards: [] },
  ];
}

@Component({
  imports: [KanbanBoardComponent],
  template: `<ngx-kanban-board
    [columns]="columns"
    [disabled]="disabled"
    (cardMoved)="moved.push($event)"
    (cardClicked)="clicked.push($event)"
    (columnsChange)="changes.push($event)"
  />`,
})
class HostComponent {
  columns = makeColumns();
  disabled = false;
  moved: CardMovedEvent[] = [];
  clicked: KanbanCard[] = [];
  changes: KanbanColumn[][] = [];
}

/** Minimal CdkDragDrop stub - only the fields the component reads. */
function dropEvent(
  from: KanbanCard[],
  to: KanbanCard[],
  previousIndex: number,
  currentIndex: number,
): CdkDragDrop<KanbanCard[]> {
  return {
    previousContainer: { data: from },
    container: { data: to },
    previousIndex,
    currentIndex,
  } as CdkDragDrop<KanbanCard[]>;
}

describe('KanbanBoardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let board: KanbanBoardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    board = fixture.debugElement.children[0].componentInstance;
  });

  const el = (): HTMLElement => fixture.nativeElement;

  it('renders one section per column with titles', () => {
    const titles = Array.from(el().querySelectorAll('.nkb-column-title')).map((n) => n.textContent?.trim());
    expect(titles).toEqual(['To Do', 'Doing', 'Done']);
  });

  it('renders cards with title, description, and tags', () => {
    const firstColumn = el().querySelector('.nkb-column')!;
    const cards = firstColumn.querySelectorAll('.nkb-card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.nkb-card-title')?.textContent).toContain('Task A');
    expect(cards[0].querySelector('.nkb-tag')?.textContent).toContain('x');
    expect(cards[1].querySelector('.nkb-card-desc')?.textContent).toContain('desc B');
  });

  it('shows the empty state for a column without cards', () => {
    const columns = el().querySelectorAll('.nkb-column');
    expect(columns[2].querySelector('.nkb-empty')?.textContent).toContain('No cards');
  });

  it('shows count and wip limit, and flags over-limit columns', () => {
    const doing = el().querySelectorAll('.nkb-column')[1];
    expect(doing.querySelector('.nkb-count')?.textContent?.replace(/\s/g, '')).toBe('2/1');
    expect(doing.classList).toContain('nkb-over-limit');
    expect(board.overLimit().has('doing')).toBe(true);
    expect(board.overLimit().has('todo')).toBe(false);
  });

  it('does not flag columns at exactly the wip limit', () => {
    host.columns = [{ id: 'x', title: 'X', wipLimit: 2, cards: makeColumns()[0].cards }];
    fixture.detectChanges();
    expect(board.overLimit().has('x')).toBe(false);
  });

  it('emits cardClicked when a card is clicked', () => {
    (el().querySelector('.nkb-card') as HTMLElement).click();
    expect(host.clicked.map((c) => c.id)).toEqual(['a']);
  });

  it('reorders within a column and emits cardMoved + columnsChange', () => {
    const todo = host.columns[0];
    board.onDrop(dropEvent(todo.cards, todo.cards, 0, 1), todo);

    expect(todo.cards.map((c) => c.id)).toEqual(['b', 'a']);
    expect(host.moved).toHaveLength(1);
    expect(host.moved[0]).toEqual(
      expect.objectContaining({ fromColumnId: 'todo', toColumnId: 'todo', toIndex: 1 }),
    );
    expect(host.moved[0].card.id).toBe('a');
    expect(host.changes).toHaveLength(1);
  });

  it('transfers between columns and emits with source and target ids', () => {
    const [todo, , done] = host.columns;
    board.onDrop(dropEvent(todo.cards, done.cards, 1, 0), done);

    expect(todo.cards.map((c) => c.id)).toEqual(['a']);
    expect(done.cards.map((c) => c.id)).toEqual(['b']);
    expect(host.moved[0]).toEqual(
      expect.objectContaining({ fromColumnId: 'todo', toColumnId: 'done', toIndex: 0 }),
    );
  });

  it('ignores drops whose source list does not belong to the board', () => {
    const done = host.columns[2];
    board.onDrop(dropEvent([{ id: 'zz', title: 'alien' }], done.cards, 0, 0), done);
    expect(done.cards).toHaveLength(0);
    expect(host.moved).toHaveLength(0);
  });

  it('disables the drop lists when disabled is set', () => {
    const disabledFixture = TestBed.createComponent(HostComponent);
    disabledFixture.componentInstance.disabled = true;
    disabledFixture.detectChanges();

    const lists = disabledFixture.debugElement.queryAll(By.directive(CdkDropList));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      expect(list.injector.get(CdkDropList).disabled).toBe(true);
    }
  });
});
