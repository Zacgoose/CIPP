import { TablePagination } from '@mui/material'

export const CippTablePagination = ({ table, rowsPerPageOptions = [25, 50, 100, 250, 500] }) => {
  const { pageIndex, pageSize } = table.getState().pagination
  const count = table.getFilteredRowModel().rows.length
  return (
    <TablePagination
      component="div"
      count={count}
      page={pageIndex}
      rowsPerPage={pageSize}
      onPageChange={(_, newPage) => table.setPageIndex(newPage)}
      onRowsPerPageChange={(e) => {
        table.setPageSize(parseInt(e.target.value, 10))
        table.setPageIndex(0)
      }}
      rowsPerPageOptions={rowsPerPageOptions}
      showFirstButton
      showLastButton
    />
  )
}
