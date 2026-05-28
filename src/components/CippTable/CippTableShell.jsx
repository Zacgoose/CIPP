import { useRef } from 'react'
import { Paper, Table, TableContainer, Box } from '@mui/material'

// Outer chrome for the table: paper, scroll container with sticky header, fullscreen overlay.
export const CippTableShell = ({
  children,
  isFullScreen,
  sidebarCollapsed,
  maxHeight,
  paperSx,
  containerProps,
  scrollContainerRef,
}) => {
  const localRef = useRef(null)
  const ref = scrollContainerRef || localRef

  const fullScreenSx = isFullScreen
    ? {
        position: 'fixed !important',
        top: '64px !important',
        bottom: '0 !important',
        left: { xs: '0 !important', lg: sidebarCollapsed ? '73px !important' : '270px !important' },
        right: '0 !important',
        zIndex: 1300,
        m: '0 !important',
        p: '16px !important',
        overflow: 'auto',
        bgcolor: 'background.paper',
        maxWidth: 'none !important',
        width: 'auto !important',
        height: 'auto !important',
      }
    : {}

  return (
    <Paper elevation={0} sx={{ width: '100%', ...fullScreenSx, ...(paperSx || {}) }}>
      <TableContainer
        ref={ref}
        sx={{
          maxHeight: isFullScreen ? 'calc(100vh - 200px)' : maxHeight,
          overflow: 'auto',
        }}
        {...(containerProps || {})}
      >
        {children}
      </TableContainer>
    </Paper>
  )
}

export const CippTableEl = ({ table, children }) => (
  <Table
    stickyHeader
    size="small"
    sx={{
      width: table.getCenterTotalSize?.() || 'auto',
      tableLayout: 'fixed',
      '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' },
    }}
  >
    {children}
  </Table>
)
