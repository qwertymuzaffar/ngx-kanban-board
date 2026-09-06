# ngx-kanban-board

[![npm version](https://img.shields.io/npm/v/ngx-kanban-board)](https://www.npmjs.com/package/ngx-kanban-board)
[![CI](https://github.com/qwertymuzaffar/ngx-kanban-board/actions/workflows/ci.yml/badge.svg)](https://github.com/qwertymuzaffar/ngx-kanban-board/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ngx-kanban-board)](LICENSE)
[![Angular](https://img.shields.io/badge/Angular-%3E%3D19-dd0031)](https://angular.dev)

**[Live Storybook demo](https://qwertymuzaffar.github.io/ngx-kanban-board/)**

Drag-and-drop kanban board component for Angular - built on Angular CDK, with a signals-based API, WIP limits, and CSS-custom-property theming. Zero dependencies beyond `@angular/cdk`.

## Features

- **Drag & drop** across and within columns (Angular CDK `DropListGroup`)
- **WIP limits** - columns highlight and badge in red when over their `wipLimit`
- **Signals API** - `input()`/`output()` based, `OnPush`, works controlled or uncontrolled
- **Themeable** - every color and radius is a `--nkb-*` CSS custom property (dark theme = a few variables)
- **Tested & documented** - 95%+ unit-test coverage, Storybook stories for every state

## Install

```bash
npm install ngx-kanban-board @angular/cdk
```

## Usage

```ts
import { KanbanBoardComponent, KanbanColumn, CardMovedEvent } from 'ngx-kanban-board';

@Component({
  imports: [KanbanBoardComponent],
  template: `<ngx-kanban-board [columns]="columns" (cardMoved)="persist($event)" />`,
})
export class BoardPage {
  columns: KanbanColumn[] = [
    { id: 'todo', title: 'To Do', cards: [{ id: '1', title: 'First task' }] },
    { id: 'doing', title: 'Doing', wipLimit: 3, cards: [] },
    { id: 'done', title: 'Done', cards: [] },
  ];

  persist(e: CardMovedEvent) { /* e.card, e.fromColumnId, e.toColumnId, e.toIndex */ }
}
```

## API

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `columns` | `KanbanColumn[]` | required | Board model; mutated in place on drop |
| `disabled` | `boolean` | `false` | Read-only board (dragging and editing off) |
| `showAddColumn` | `boolean` | `false` | Ghost "+ Add column" button after the last column |
| `editableTitles` | `boolean` | `false` | Inline column renaming (double-click or Enter on a title) |

### Outputs

| Output | Payload | Fires |
|---|---|---|
| `cardMoved` | `CardMovedEvent` | After any drop (reorder or transfer) |
| `cardClicked` | `KanbanCard` | Card click |
| `columnsChange` | `KanbanColumn[]` | After any drop or rename, with the updated model |
| `addColumnRequested` | `void` | Add-column button clicked - you create the column |
| `columnRenamed` | `ColumnRenamedEvent` | Inline rename committed (`columnId`, `title`, `previousTitle`) |

### Managing columns

The board treats `columns` as its working model - column CRUD lives in your
app, so persistence, permissions, and confirmation flows stay yours:

```ts
// respond to the built-in add button (showAddColumn)
onAddColumn() {
  this.columns.push({ id: crypto.randomUUID(), title: 'New column', cards: [] });
}

// rename from code (or let editableTitles handle it inline)
rename(id: string, title: string) {
  this.columns = this.columns.map(c => (c.id === id ? { ...c, title } : c));
}

// remove a column - decide what happens to its cards
remove(id: string) {
  const dying = this.columns.find(c => c.id === id);
  this.columns.find(c => c.id !== id)?.cards.push(...(dying?.cards ?? []));
  this.columns = this.columns.filter(c => c.id !== id);
}
```

### Theming

Override CSS custom properties on the host or any ancestor:

```css
ngx-kanban-board {
  --nkb-bg: #0f172a;
  --nkb-column-bg: #1e293b;
  --nkb-card-bg: #273449;
  --nkb-ink: #e2e8f0;
  --nkb-accent: #38bdf8;
}
```

Full list in `kanban-board.component.scss`.

## Development

```bash
npm start                          # demo app
ng test ngx-kanban-board           # unit tests (vitest)
ng run demo:storybook              # storybook
```

Requires Node 22+ and Angular 19+.

## License

MIT
