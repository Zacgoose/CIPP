import { flexRender } from '@tanstack/react-table'
import {
  TableHead,
  TableRow,
  TableCell,
  Box,
  Tooltip,
} from '@mui/material'
import {
  ArrowUpward as ArrowUp,
  ArrowDownward as ArrowDown,
  UnfoldMore,
} from '@mui/icons-material'
import { CippColumnFilter } from './CippColumnFilter'

// Compute pinning offset/sticky styles for a header or cell.
export const pinnedStyles = (column) => {
  if (!column) return {}
  const isPinned = column.getIsPinned?.()
  if (!isPinned) return {}
  const isLastLeft = isPinned === 'left' && column.getIsLastColumn?.('left')
  const isFirstRight = isPinned === 'right' && column.getIsFirstColumn?.('right')
  return {
    position: 'sticky',
    zIndex: 2,
    backgroundColor: 'background.paper',
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    boxShadow: isLastLeft
      ? '4px 0 4px -4px rgba(0,0,0,0.15)'
      : isFirstRight
        ? '-4px 0 4px -4px rgba(0,0,0,0.15)'
        : undefined,
  }
}

export const CippTableHead = ({ table, showColumnFilters, sticky = true, enableModes }) => {
  return (
    <TableHead
      sx={
        sticky
          ? {
              position: 'sticky',
              top: 0,
              zIndex: 3,
              backgroundColor: 'background.paper',
            }
          : undefined
      }
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const column = header.column
            const canSort = column.getCanSort()
            const sorted = column.getIsSorted()
            const meta = column.columnDef.meta || {}
            const width = header.getSize()
            const isInternal = meta.isInternal === true

            return (
              <TableCell
                key={header.id}
                colSpan={header.colSpan}
                sx={{
                  width,
                  minWidth: column.columnDef.minSize ?? width,
                  maxWidth: width,
                  position: 'relative',
                  padding: isInternal ? '4px' : '8px 16px',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  backgroundColor: 'background.paper',
                  ...pinnedStyles(column),
                }}
              >
                {header.isPlaceholder ? null : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: canSort ? 'pointer' : 'default',
                    }}
                    onClick={canSort ? column.getToggleSortingHandler() : undefined}
                  >
                    <Box
                      component="span"
                      sx={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {flexRender(column.columnDef.header, header.getContext())}
                    </Box>
                    {canSort && !isInternal && (
                      <Tooltip
                        title={
                          sorted === 'asc'
                            ? 'Sorted ascending'
                            : sorted === 'desc'
                              ? 'Sorted descending'
                              : 'Sort'
                        }
                      >
                        <Box sx={{ display: 'flex', color: 'text.secondary' }}>
                          {sorted === 'asc' ? (
                            <ArrowUp fontSize="inherit" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown fontSize="inherit" />
                          ) : (
                            <UnfoldMore fontSize="inherit" />
                          )}
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                )}
                {/* Resize handle */}
                {column.getCanResize?.() && !isInternal && (
                  <Box
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: 'absolute',
                      right: '-4px',
                      top: 0,
                      height: '100%',
                      width: '9px',
                      cursor: 'col-resize',
                      userSelect: 'none',
                      touchAction: 'none',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&::after': {
                        content: '""',
                        width: '1px',
                        height: '60%',
                        backgroundColor: column.getIsResizing()
                          ? 'primary.main'
                          : 'divider',
                        transition: 'background-color 0.15s',
                      },
                      '&:hover::after': {
                        width: '2px',
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
                )}
              </TableCell>
            )
          })}
        </TableRow>
      ))}
      {/* Column-filter row */}
      {showColumnFilters && (
        <TableRow>
          {table.getHeaderGroups()[table.getHeaderGroups().length - 1].headers.map((header) => {
            const column = header.column
            const meta = column.columnDef.meta || {}
            const canFilter = column.getCanFilter() && !meta.isInternal
            const width = header.getSize()
            return (
              <TableCell
                key={`${header.id}-filter`}
                sx={{
                  width,
                  minWidth: width,
                  maxWidth: width,
                  p: '4px 8px',
                  backgroundColor: 'background.paper',
                  ...pinnedStyles(column),
                }}
              >
                {canFilter ? (
                  <CippColumnFilter column={column} table={table} enableModes={enableModes} />
                ) : null}
              </TableCell>
            )
          })}
        </TableRow>
      )}
    </TableHead>
  )
}
