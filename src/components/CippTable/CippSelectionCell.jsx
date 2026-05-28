import { Checkbox } from '@mui/material'

// `selectAllMode === 'all'` selects every filtered row regardless of pagination,
// matching the old MRT default that the toolbar code already assumes.
export const CippSelectAllHeader = ({ table, mode = 'all' }) => {
  const allSelected =
    mode === 'all' ? table.getIsAllRowsSelected() : table.getIsAllPageRowsSelected()
  const someSelected =
    mode === 'all' ? table.getIsSomeRowsSelected() : table.getIsSomePageRowsSelected()
  const handler =
    mode === 'all' ? table.getToggleAllRowsSelectedHandler() : table.getToggleAllPageRowsSelectedHandler()
  return (
    <Checkbox
      size="small"
      checked={allSelected}
      indeterminate={!allSelected && someSelected}
      onChange={handler}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

export const CippSelectionCell = ({ row }) => (
  <Checkbox
    size="small"
    checked={row.getIsSelected()}
    disabled={!row.getCanSelect()}
    indeterminate={row.getIsSomeSelected()}
    onChange={row.getToggleSelectedHandler()}
    onClick={(e) => e.stopPropagation()}
  />
)
