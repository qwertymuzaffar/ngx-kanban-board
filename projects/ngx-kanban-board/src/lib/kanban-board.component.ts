import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import type {
  CardAddedEvent,
  CardMovedEvent,
  ColumnRenamedEvent,
  KanbanCard,
  KanbanColumn,
} from './kanban.models';

/**
 * Drag-and-drop kanban board built on Angular CDK.
 *
 * Pointer dragging is CDK-based; a keyboard mode mirrors it for
 * accessibility: focus a card, Space/Enter lifts it, arrow keys move
 * it within and across columns, Space drops, Escape cancels.
 *
 * The component treats `columns` as its working model and emits
 * `cardMoved` / `columnsChange` after every move, so consumers can
 * persist changes or run the board fully controlled.
 */
@Component({
  selector: 'ngx-kanban-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent {
  columns = input.required<KanbanColumn[]>();
  /** Disables all dragging and editing (read-only board). */
  disabled = input(false);
  /** Shows a ghost "+ Add column" button after the last column. */
  showAddColumn = input(false);
  /** Enables inline column renaming (double-click or Enter on a title). */
  editableTitles = input(false);
  /** Shows a "+ Add card" composer at the foot of each column. */
  showAddCard = input(false);

  cardMoved = output<CardMovedEvent>();
  cardClicked = output<KanbanCard>();
  columnsChange = output<KanbanColumn[]>();
  /** The add-column button was clicked - the consumer creates the column. */
  addColumnRequested = output<void>();
  columnRenamed = output<ColumnRenamedEvent>();
  /** A card was created through the add-card composer. */
  cardAdded = output<CardAddedEvent>();

  /** Card currently lifted via keyboard, if any. */
  readonly liftedCardId = signal<string | null>(null);
  /** Column whose title is being edited inline, if any. */
  readonly editingColumnId = signal<string | null>(null);
  /** Column whose add-card composer is open, if any. */
  readonly addingCardColumnId = signal<string | null>(null);

  readonly overLimit = computed(() =>
    new Set(
      this.columns()
        .filter((c) => c.wipLimit !== undefined && c.cards.length > c.wipLimit)
        .map((c) => c.id),
    ),
  );

  onDrop(event: CdkDragDrop<KanbanCard[]>, target: KanbanColumn): void {
    const source = this.columns().find((c) => c.cards === event.previousContainer.data);
    if (!source) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(target.cards, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.emitMove(target.cards[event.currentIndex], source.id, target.id, event.currentIndex);
  }

  /** Keyboard interaction: Space/Enter lift & drop, arrows move, Escape cancels. */
  onCardKeydown(event: KeyboardEvent, card: KanbanCard, column: KanbanColumn): void {
    if (this.disabled()) return;

    const key = event.key;
    const lifted = this.liftedCardId() === card.id;

    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      this.liftedCardId.set(lifted ? null : card.id);
      return;
    }
    if (!lifted) return;

    if (key === 'Escape') {
      event.preventDefault();
      this.liftedCardId.set(null);
      return;
    }

    const vertical = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
    const horizontal = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
    if (!vertical && !horizontal) return;
    event.preventDefault();

    const cols = this.columns();
    const colIndex = cols.indexOf(column);
    const cardIndex = column.cards.indexOf(card);

    if (vertical) {
      const next = cardIndex + vertical;
      if (next < 0 || next >= column.cards.length) return;
      moveItemInArray(column.cards, cardIndex, next);
      this.emitMove(card, column.id, column.id, next);
    } else {
      const targetCol = cols[colIndex + horizontal];
      if (!targetCol) return;
      const insertAt = Math.min(cardIndex, targetCol.cards.length);
      transferArrayItem(column.cards, targetCol.cards, cardIndex, insertAt);
      this.emitMove(card, column.id, targetCol.id, insertAt);
    }
    this.refocus(card.id);
  }

  /** Begin inline renaming of a column title. */
  startEditing(column: KanbanColumn): void {
    if (!this.editableTitles() || this.disabled()) return;
    this.editingColumnId.set(column.id);
    this.focusAfterRender('.nkb-title-input', { select: true });
  }

  /**
   * Commit an inline rename. No-ops when editing already ended (guards
   * the blur that fires after Enter/Escape removed the input), when the
   * value is empty, or when nothing changed.
   */
  commitRename(column: KanbanColumn, rawValue: string): void {
    if (this.editingColumnId() !== column.id) return;
    this.editingColumnId.set(null);
    const title = rawValue.trim();
    if (!title || title === column.title) return;
    const previousTitle = column.title;
    column.title = title;
    this.columnRenamed.emit({ columnId: column.id, title, previousTitle });
    this.emitColumns();
  }

  cancelRename(): void {
    this.editingColumnId.set(null);
  }

  /** Open the add-card composer at the foot of a column. */
  startAddCard(column: KanbanColumn): void {
    if (!this.showAddCard() || this.disabled()) return;
    this.addingCardColumnId.set(column.id);
    this.focusAfterRender('.nkb-card-input');
  }

  /**
   * Commit the composer. Unlike add-column, the board creates the card
   * itself (mirroring rename) and reports it via `cardAdded` - consumers
   * may replace the generated id. Enter keeps the composer open for
   * rapid entry; blur commits and closes; an empty value just closes.
   */
  commitAddCard(column: KanbanColumn, composer: HTMLInputElement, keepOpen: boolean): void {
    if (this.addingCardColumnId() !== column.id) return;
    const title = composer.value.trim();
    if (!title) {
      this.closeCardComposer();
      return;
    }
    const card: KanbanCard = { id: this.newCardId(), title };
    column.cards.push(card);
    this.cardAdded.emit({ card, columnId: column.id });
    this.emitColumns();
    if (keepOpen) {
      composer.value = '';
      composer.focus();
    } else {
      this.closeCardComposer();
    }
  }

  cancelAddCard(): void {
    this.closeCardComposer();
  }

  private closeCardComposer(): void {
    this.addingCardColumnId.set(null);
  }

  /** Every mutation of the board reports the full column set to consumers. */
  private emitColumns(): void {
    this.columnsChange.emit(this.columns());
  }

  private cardSeq = 0;

  private newCardId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `nkb-${crypto.randomUUID()}`
      : `nkb-card-${++this.cardSeq}`;
  }

  private emitMove(card: KanbanCard, fromColumnId: string, toColumnId: string, toIndex: number): void {
    this.cardMoved.emit({ card, fromColumnId, toColumnId, toIndex });
    this.emitColumns();
  }

  /** Keep focus on the moved card after the DOM re-renders (cross-column moves recreate the element). */
  private refocus(cardId: string): void {
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(cardId)
        : cardId.replace(/["\\]/g, '\\$&');
    this.focusAfterRender(`[data-nkb-card-id="${escaped}"]`);
  }

  /**
   * Focus the element matching `selector` once it exists. setTimeout, not
   * queueMicrotask: change detection is itself scheduled as a microtask, so
   * an element created by a signal change does not exist until the next
   * macrotask. `select` also selects the text of an input.
   */
  private focusAfterRender(selector: string, options: { select?: boolean } = {}): void {
    setTimeout(() => {
      const element = document.querySelector<HTMLElement>(selector);
      element?.focus();
      if (options.select && element instanceof HTMLInputElement) element.select();
    });
  }
}
