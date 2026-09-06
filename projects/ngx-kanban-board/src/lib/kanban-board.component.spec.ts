import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { KanbanBoardComponent } from './kanban-board.component';
import type {
  CardAddedEvent,
  CardMovedEvent,
  ColumnRenamedEvent,
  KanbanCard,
  KanbanColumn,
} from './kanban.models';

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
    [showAddColumn]="showAddColumn"
    [editableTitles]="editableTitles"
    [showAddCard]="showAddCard"
    (cardMoved)="moved.push($event)"
    (cardClicked)="clicked.push($event)"
    (columnsChange)="changes.push($event)"
    (addColumnRequested)="addRequests = addRequests + 1"
    (columnRenamed)="renames.push($event)"
    (cardAdded)="added.push($event)"
  />`,
})
class HostComponent {
  columns = makeColumns();
  disabled = false;
  showAddColumn = false;
  editableTitles = false;
  showAddCard = false;
  moved: CardMovedEvent[] = [];
  clicked: KanbanCard[] = [];
  changes: KanbanColumn[][] = [];
  addRequests = 0;
  renames: ColumnRenamedEvent[] = [];
  added: CardAddedEvent[] = [];
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

  describe('keyboard drag-and-drop', () => {
    const key = (target: Element, k: string) => {
      const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      target.dispatchEvent(ev);
      fixture.detectChanges();
      return ev;
    };
    const firstCard = () => el().querySelector('.nkb-card')!;

    it('lifts a card with Space and marks it', () => {
      key(firstCard(), ' ');
      expect(board.liftedCardId()).toBe('a');
      expect(firstCard().classList).toContain('nkb-lifted');
    });

    it('drops with a second Space', () => {
      key(firstCard(), ' ');
      key(firstCard(), ' ');
      expect(board.liftedCardId()).toBeNull();
    });

    it('cancels with Escape', () => {
      key(firstCard(), 'Enter');
      key(firstCard(), 'Escape');
      expect(board.liftedCardId()).toBeNull();
    });

    it('moves a lifted card down within its column and emits', () => {
      key(firstCard(), ' ');
      key(firstCard(), 'ArrowDown');
      expect(host.columns[0].cards.map((c) => c.id)).toEqual(['b', 'a']);
      expect(host.moved[0]).toEqual(
        expect.objectContaining({ fromColumnId: 'todo', toColumnId: 'todo', toIndex: 1 }),
      );
    });

    it('moves a lifted card to the next column with ArrowRight', () => {
      key(firstCard(), ' ');
      key(firstCard(), 'ArrowRight');
      expect(host.columns[0].cards.map((c) => c.id)).toEqual(['b']);
      expect(host.columns[1].cards.map((c) => c.id)).toEqual(['a', 'c', 'd']);
      expect(host.moved[0]).toEqual(
        expect.objectContaining({ fromColumnId: 'todo', toColumnId: 'doing', toIndex: 0 }),
      );
    });

    it('ignores arrows when no card is lifted', () => {
      key(firstCard(), 'ArrowDown');
      expect(host.columns[0].cards.map((c) => c.id)).toEqual(['a', 'b']);
      expect(host.moved).toHaveLength(0);
    });

    it('does not move past column edges', () => {
      key(firstCard(), ' ');
      key(firstCard(), 'ArrowUp');
      expect(host.columns[0].cards.map((c) => c.id)).toEqual(['a', 'b']);
      key(firstCard(), 'ArrowLeft');
      expect(host.columns[0].cards.map((c) => c.id)).toEqual(['a', 'b']);
      expect(host.moved).toHaveLength(0);
    });

    it('ignores keyboard when disabled', () => {
      const f2 = TestBed.createComponent(HostComponent);
      f2.componentInstance.disabled = true;
      f2.detectChanges();
      const card = (f2.nativeElement as HTMLElement).querySelector('.nkb-card')!;
      card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      f2.detectChanges();
      const b2: KanbanBoardComponent = f2.debugElement.children[0].componentInstance;
      expect(b2.liftedCardId()).toBeNull();
      expect(card.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('column editing (v0.4)', () => {
    function createWith(overrides: Partial<HostComponent>): ComponentFixture<HostComponent> {
      const f = TestBed.createComponent(HostComponent);
      Object.assign(f.componentInstance, overrides);
      f.detectChanges();
      return f;
    }
    const root = (f: ComponentFixture<HostComponent>): HTMLElement => f.nativeElement;
    const dblclick = (t: Element) => t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const keydown = (t: Element, key: string) =>
      t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    it('hides the add-column button by default', () => {
      expect(el().querySelector('.nkb-add-column')).toBeNull();
    });

    it('shows the add-column button and emits on click', () => {
      const f = createWith({ showAddColumn: true });
      const btn = root(f).querySelector<HTMLButtonElement>('.nkb-add-column')!;
      expect(btn.textContent).toContain('Add column');
      btn.click();
      btn.click();
      expect(f.componentInstance.addRequests).toBe(2);
    });

    it('hides the add-column button when disabled', () => {
      const f = createWith({ showAddColumn: true, disabled: true });
      expect(root(f).querySelector('.nkb-add-column')).toBeNull();
    });

    it('does not start editing when editableTitles is off', () => {
      const f = createWith({});
      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      expect(root(f).querySelector('.nkb-title-input')).toBeNull();
    });

    it('opens an input with the current title on double-click', () => {
      const f = createWith({ editableTitles: true });
      const title = root(f).querySelector('.nkb-column-title')!;
      expect(title.classList).toContain('nkb-editable');
      expect(title.getAttribute('tabindex')).toBe('0');
      dblclick(title);
      f.detectChanges();
      const input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      expect(input.value).toBe('To Do');
    });

    it('commits a rename on Enter and emits columnRenamed + columnsChange', () => {
      const f = createWith({ editableTitles: true });
      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      const input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      input.value = '  Ready  ';
      keydown(input, 'Enter');
      f.detectChanges();

      expect(f.componentInstance.columns[0].title).toBe('Ready');
      expect(f.componentInstance.renames).toEqual([
        { columnId: 'todo', title: 'Ready', previousTitle: 'To Do' },
      ]);
      expect(f.componentInstance.changes).toHaveLength(1);
      expect(root(f).querySelector('.nkb-title-input')).toBeNull();
      expect(root(f).querySelector('.nkb-column-title')?.textContent).toContain('Ready');
    });

    it('cancels on Escape without emitting', () => {
      const f = createWith({ editableTitles: true });
      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      const input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      input.value = 'Ignored';
      keydown(input, 'Escape');
      f.detectChanges();

      expect(f.componentInstance.columns[0].title).toBe('To Do');
      expect(f.componentInstance.renames).toHaveLength(0);
      expect(root(f).querySelector('.nkb-title-input')).toBeNull();
    });

    it('commits on blur', () => {
      const f = createWith({ editableTitles: true });
      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      const input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      input.value = 'Blurred';
      input.dispatchEvent(new Event('blur'));
      f.detectChanges();
      expect(f.componentInstance.columns[0].title).toBe('Blurred');
      expect(f.componentInstance.renames).toHaveLength(1);
    });

    it('treats an empty or unchanged value as a cancel', () => {
      const f = createWith({ editableTitles: true });
      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      let input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      input.value = '   ';
      keydown(input, 'Enter');
      f.detectChanges();
      expect(f.componentInstance.columns[0].title).toBe('To Do');

      dblclick(root(f).querySelector('.nkb-column-title')!);
      f.detectChanges();
      input = root(f).querySelector<HTMLInputElement>('.nkb-title-input')!;
      input.value = 'To Do';
      keydown(input, 'Enter');
      f.detectChanges();
      expect(f.componentInstance.renames).toHaveLength(0);
    });

    it('starts editing via Enter on the focused title', () => {
      const f = createWith({ editableTitles: true });
      keydown(root(f).querySelector('.nkb-column-title')!, 'Enter');
      f.detectChanges();
      expect(root(f).querySelector('.nkb-title-input')).not.toBeNull();
    });

    it('ignores editing when disabled', () => {
      const f = createWith({ editableTitles: true, disabled: true });
      const title = root(f).querySelector('.nkb-column-title')!;
      expect(title.classList).not.toContain('nkb-editable');
      dblclick(title);
      f.detectChanges();
      expect(root(f).querySelector('.nkb-title-input')).toBeNull();
    });
  });

  describe('card adding (v0.5)', () => {
    function createWith(overrides: Partial<HostComponent>): ComponentFixture<HostComponent> {
      const f = TestBed.createComponent(HostComponent);
      Object.assign(f.componentInstance, overrides);
      f.detectChanges();
      return f;
    }
    const root = (f: ComponentFixture<HostComponent>): HTMLElement => f.nativeElement;
    const keydown = (t: Element, key: string) =>
      t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    function openComposer(f: ComponentFixture<HostComponent>): HTMLInputElement {
      root(f).querySelector<HTMLButtonElement>('.nkb-add-card')!.click();
      f.detectChanges();
      return root(f).querySelector<HTMLInputElement>('.nkb-card-input')!;
    }

    it('hides the add-card button by default and when disabled', () => {
      expect(el().querySelector('.nkb-add-card')).toBeNull();
      const f = createWith({ showAddCard: true, disabled: true });
      expect(root(f).querySelector('.nkb-add-card')).toBeNull();
    });

    it('shows one add-card button per column', () => {
      const f = createWith({ showAddCard: true });
      expect(root(f).querySelectorAll('.nkb-add-card')).toHaveLength(3);
    });

    it('opens the composer in place of the clicked button only', () => {
      const f = createWith({ showAddCard: true });
      const input = openComposer(f);
      expect(input).not.toBeNull();
      expect(root(f).querySelectorAll('.nkb-card-input')).toHaveLength(1);
      expect(root(f).querySelectorAll('.nkb-add-card')).toHaveLength(2);
    });

    it('creates a card on Enter, emits cardAdded + columnsChange, and stays open', () => {
      const f = createWith({ showAddCard: true });
      const input = openComposer(f);
      input.value = '  Ship v0.5  ';
      keydown(input, 'Enter');
      f.detectChanges();

      const todo = f.componentInstance.columns[0];
      expect(todo.cards.map((c) => c.title)).toEqual(['Task A', 'Task B', 'Ship v0.5']);
      expect(f.componentInstance.added).toHaveLength(1);
      expect(f.componentInstance.added[0].columnId).toBe('todo');
      expect(f.componentInstance.added[0].card.title).toBe('Ship v0.5');
      expect(f.componentInstance.added[0].card.id).toMatch(/^nkb-/);
      expect(f.componentInstance.changes).toHaveLength(1);
      // rapid entry: composer stays open and is cleared
      const after = root(f).querySelector<HTMLInputElement>('.nkb-card-input')!;
      expect(after.value).toBe('');
    });

    it('generates a distinct id per card', () => {
      const f = createWith({ showAddCard: true });
      const input = openComposer(f);
      input.value = 'One';
      keydown(input, 'Enter');
      input.value = 'Two';
      keydown(input, 'Enter');
      f.detectChanges();
      const [a, b] = f.componentInstance.added;
      expect(a.card.id).not.toBe(b.card.id);
    });

    it('commits and closes on blur', () => {
      const f = createWith({ showAddCard: true });
      const input = openComposer(f);
      input.value = 'Blurred card';
      input.dispatchEvent(new Event('blur'));
      f.detectChanges();
      expect(f.componentInstance.columns[0].cards.map((c) => c.title)).toContain('Blurred card');
      expect(root(f).querySelector('.nkb-card-input')).toBeNull();
    });

    it('closes without adding on Escape or empty commit', () => {
      const f = createWith({ showAddCard: true });
      let input = openComposer(f);
      input.value = 'Discarded';
      keydown(input, 'Escape');
      f.detectChanges();
      expect(root(f).querySelector('.nkb-card-input')).toBeNull();

      input = openComposer(f);
      input.value = '   ';
      keydown(input, 'Enter');
      f.detectChanges();
      expect(root(f).querySelector('.nkb-card-input')).toBeNull();
      expect(f.componentInstance.columns[0].cards).toHaveLength(2);
      expect(f.componentInstance.added).toHaveLength(0);
    });

    it('counts composer-added cards toward the wip limit', () => {
      const f = createWith({ showAddCard: true });
      const doing = root(f).querySelectorAll('.nkb-column')[1];
      doing.querySelector<HTMLButtonElement>('.nkb-add-card')!.click();
      f.detectChanges();
      const input = doing.querySelector<HTMLInputElement>('.nkb-card-input')!;
      input.value = 'Over the limit';
      keydown(input, 'Enter');
      f.detectChanges();
      expect(doing.querySelector('.nkb-count')?.textContent?.replace(/\s/g, '')).toBe('3/1');
    });
  });
});
