import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { flexRender } from '@tanstack/react-table'
import { TableBody, TableRow, TableCell, Skeleton, Box } from '@mui/material'
import { pinnedStyles } from './CippTableHead'

// Intercept copy so users get the *visible text* selection rather than the raw row.
const handleCopy = (e) => {
  const sel = window.getSelection()?.toString() ?? ''
  if (!sel) return
  e.preventDefault()
  e.stopPropagation()
  e.nativeEvent?.stopImmediatePropagation?.()
  e.clipboardData.setData('text/plain', sel)
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(sel).catch(() => {})
}

export const CippTableBody = ({
  table,
  scrollContainerRef,
  showSkeletons,
  emptyFallback,
  onRowClick,
}) => {
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 36,
    overscan: 5,
  })

  if (showSkeletons) {
    const pageSize = table.getState().pagination?.pageSize ?? 10
    const visibleColumns = table.getVisibleLeafColumns()
    return (
      <TableBody>
        {Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
          <TableRow key={`skeleton-${i}`}>
            {visibleColumns.map((c) => (
              <TableCell key={c.id} sx={{ p: '6px 16px' }}>
                <Skeleton variant="text" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    )
  }

  if (rows.length === 0) {
    const visibleColumns = table.getVisibleLeafColumns()
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={visibleColumns.length || 1} align="center" sx={{ py: 4 }}>
            {emptyFallback ?? <Box sx={{ color: 'text.secondary' }}>No records to display</Box>}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <TableBody>
      {paddingTop > 0 && (
        <TableRow>
          <TableCell colSpan={table.getVisibleLeafColumns().length} sx={{ p: 0, border: 0, height: paddingTop }} />
        </TableRow>
      )}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index]
        const rowClickProps = onRowClick ? onRowClick({ row }) : null
        const safeClickProps = rowClickProps || {}
        return (
          <TableRow
            key={row.id}
            data-index={virtualRow.index}
            selected={row.getIsSelected?.()}
            {...safeClickProps}
            sx={{
              '&:hover': { backgroundColor: 'action.hover' },
              ...(safeClickProps.sx || {}),
            }}
          >
            {row.getVisibleCells().map((cell) => {
              const width = cell.column.getSize()
              return (
                <TableCell
                  key={cell.id}
                  onCopy={handleCopy}
                  sx={{
                    width,
                    minWidth: cell.column.columnDef.minSize ?? width,
                    maxWidth: width,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '4px 16px',
                    fontSize: '0.8125rem',
                    ...pinnedStyles(cell.column),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              )
            })}
          </TableRow>
        )
      })}
      {paddingBottom > 0 && (
        <TableRow>
          <TableCell colSpan={table.getVisibleLeafColumns().length} sx={{ p: 0, border: 0, height: paddingBottom }} />
        </TableRow>
      )}
    </TableBody>
  )
}
