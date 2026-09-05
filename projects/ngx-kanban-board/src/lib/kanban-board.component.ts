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
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import type { CardMovedEvent, KanbanCard, KanbanColumn } from './kanban.models';

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
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent {
  columns = input.required<KanbanColumn[]>();
  /** Disables all dragging (read-only board). */
  disabled = input(false);

  cardMoved = output<CardMovedEvent>();
  cardClicked = output<KanbanCard>();
  columnsChange = output<KanbanColumn[]>();

  /** Card currently lifted via keyboard, if any. */
  readonly liftedCardId = signal<string | null>(null);

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

  private emitMove(card: KanbanCard, fromColumnId: string, toColumnId: string, toIndex: number): void {
    this.cardMoved.emit({ card, fromColumnId, toColumnId, toIndex });
    this.columnsChange.emit(this.columns());
  }

  /** Keep focus on the moved card after the DOM re-renders. */
  private refocus(cardId: string): void {
    queueMicrotask(() => {
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(cardId)
          : cardId.replace(/["\\]/g, '\\$&');
      const el = document.querySelector<HTMLElement>(`[data-nkb-card-id="${escaped}"]`);
      el?.focus();
    });
  }
}
