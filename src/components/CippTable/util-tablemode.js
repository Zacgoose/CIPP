// Returns the bundle of options/initial-state the CippTable hook expects.
// `simple` mode strips selection, row actions, pinning, sticky header — used for
// in-drawer/in-dialog tables where the full toolbar+pinning chrome is too heavy.
export const utilTableMode = (
  columnVisibility,
  simple,
  actions,
  simpleColumns,
  offCanvas,
  onChange,
  maxHeightOffset = '380px',
  settings = {}
) => {
  const pageSize = settings?.tablePageSize?.value
    ? parseInt(settings?.tablePageSize?.value, 10)
    : 25

  if (simple === true) {
    return {
      enableRowSelection: false,
      enableRowActions: false,
      enableSelectAll: false,
      enableColumnPinning: false,
      enableStickyHeader: false,
      rowsPerPageOptions: [25, 50, 100, 250, 500],
      maxHeight: `calc(100vh - ${maxHeightOffset})`,
      initialState: {
        columnOrder: [...simpleColumns],
        columnVisibility: { ...columnVisibility },
        density: 'compact',
        pagination: { pageSize, pageIndex: 0 },
      },
    }
  }

  return {
    enableRowSelection: !!(actions || onChange),
    enableRowActions: !!actions,
    enableSelectAll: true,
    enableFacetedValues: true,
    enableColumnFilterModes: true,
    enableStickyHeader: true,
    selectAllMode: 'all',
    enableColumnPinning: true,
    rowsPerPageOptions: [25, 50, 100, 250, 500],
    maxHeight: `calc(100vh - ${maxHeightOffset})`,
    initialState: {
      columnOrder: [...simpleColumns],
      columnVisibility: { ...columnVisibility },
      showGlobalFilter: true,
      density: 'compact',
      pagination: { pageSize, pageIndex: 0 },
      columnPinning: {
        // Internal columns rendered by CippTable. Their IDs are namespaced with `__cipp-`
        // so toolbars can filter them out via meta.isInternal.
        left: ['__cipp-row-select'],
        right: ['__cipp-row-actions'],
      },
    },
  }
}
