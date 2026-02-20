# Table Core Components

Base table components with header, body, row, and cell composition following atomic design principles.

## Components

### HarmonyTable
Main container for table structure.

**Attributes:**
- `width` - Table width (auto, 100%, or specific value)
- `bordered` - Show borders around cells
- `striped` - Alternate row colors
- `compact` - Use compact spacing

**Events:**
- `table-ready` - Dispatched when table is rendered

### HarmonyTableHeader
Container for header rows.

### HarmonyTableBody
Container for data rows.

### HarmonyTableRow
Individual table row.

**Attributes:**
- `header` - Whether this is a header row
- `selected` - Whether this row is selected
- `hoverable` - Whether to show hover effect

**Events:**
- `row-click` - Dispatched when row is clicked

### HarmonyTableCell
Individual table cell.

**Attributes:**
- `align` - Text alignment (left, center, right)
- `valign` - Vertical alignment (top, middle, bottom)
- `header` - Whether this is a header cell

## Usage

```html
<harmony-table bordered striped>
  <harmony-table-header>
    <harmony-table-row header>
      <harmony-table-cell header>Name</harmony-table-cell>
      <harmony-table-cell header align="right">Age</harmony-table-cell>
    </harmony-table-row>
  </harmony-table-header>
  <harmony-table-body>
    <harmony-table-row hoverable>
      <harmony-table-cell>John Doe</harmony-table-cell>
      <harmony-table-cell align="right">30</harmony-table-cell>
    </harmony-table-row>
  </harmony-table-body>
</harmony-table>
```

## Customization

CSS custom properties:
- `--table-bg` - Table background color
- `--table-border-color` - Border color
- `--table-header-bg` - Header background color
- `--table-header-text-color` - Header text color
- `--table-row-hover-bg` - Row hover background
- `--table-row-selected-bg` - Selected row background
- `--table-cell-padding` - Cell padding
- `--table-font-size` - Font size
- `--table-font-family` - Font family

## Performance

- Render budget: <16ms per frame
- Memory: <5MB for 1000 rows
- Initial render: <50ms

Uses CSS `display: table` for native browser optimization.

## Testing

Open `table-core.test.html` in Chrome to verify:
- Basic table structure
- Striped styling
- Compact mode
- Row selection
- Cell alignment
- Event handling

## See Also

- [Design System Documentation](../../DESIGN_SYSTEM.md#table-core)
- [Virtual Table](../../components/virtual-table/) - For large datasets