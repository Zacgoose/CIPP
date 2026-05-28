import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Box,
} from '@mui/material'
import { Info } from '@mui/icons-material'
import { isEqual } from 'lodash'

import { ResourceUnavailable } from '../resource-unavailable'
import { ResourceError } from '../resource-error'
import { Scrollbar } from '../scrollbar'
import { ApiGetCallWithPagination } from '../../api/ApiCall'
import { useSettings } from '../../hooks/use-settings'
import { useLicenseBackfill } from '../../hooks/use-license-backfill'
import { useDialog } from '../../hooks/use-dialog'
import { CippApiDialog } from '../CippComponents/CippApiDialog'
import { CippOffCanvas } from '../CippComponents/CippOffCanvas'
import { getCippError } from '../../utils/get-cipp-error'

import { utilTableMode } from './util-tablemode'
import { utilColumnsFromAPI, resolveSimpleColumnVariables } from './util-columnsFromAPI'
import { useCippTable } from './useCippTable'
import { CippTableShell, CippTableEl } from './CippTableShell'
import { CippTableHead } from './CippTableHead'
import { CippTableBody } from './CippTableBody'
import { CippTablePagination } from './CippTablePagination'
import { CippRowActionsCell } from './CippRowActionsCell'
import { CippSelectAllHeader, CippSelectionCell } from './CippSelectionCell'
import { CIPPTableToptoolbar } from './CIPPTableToptoolbar'

// ── Dotted-path resolver (used for API pagination dataKey + AllTenants check) ─
const getNestedValue = (source, path) => {
  if (!source) return undefined
  if (!path) return source
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined
    if (typeof acc !== 'object') return undefined
    return acc[key]
  }, source)
}

// Lightweight schema fingerprint used to avoid recomputing API-derived columns
// on every data change. Matches the behaviour of the old MRT-based table.
const computeSchemaKey = (data) => {
  if (!Array.isArray(data) || data.length === 0) return ''
  const sample = data.slice(0, 3)
  const keys = new Set()
  for (const row of sample) {
    if (row && typeof row === 'object') for (const k of Object.keys(row)) keys.add(k)
  }
  return [...keys].sort().join(',') + '|' + data.length
}

export const CippDataTable = (props) => {
  const {
    queryKey,
    data = [],
    columns = [],
    api = {},
    isFetching = false,
    columnVisibility: initialColumnVisibility = {
      id: false,
      RowKey: false,
      ETag: false,
      PartitionKey: false,
      Timestamp: false,
      TableTimestamp: false,
    },
    exportEnabled = true,
    simpleColumns = [],
    dataFilter,
    actions,
    title = 'Report',
    simple = false,
    cardButton,
    offCanvas = false,
    offCanvasOnRowClick = false,
    noCard = false,
    hideTitle = false,
    refreshFunction,
    incorrectDataMessage = 'Data not in correct format',
    onChange,
    filters,
    maxHeightOffset = '380px',
    defaultSorting = [],
    isInDialog = false,
    showBulkExportAction = true,
  } = props

  const settings = useSettings()

  // ── State that orchestrates data flow ─────────────────────────────────────
  const [usedData, setUsedData] = useState(data)
  const [usedColumns, setUsedColumns] = useState([])
  const [configuredSimpleColumns, setConfiguredSimpleColumns] = useState(simpleColumns)
  const [graphFilterData, setGraphFilterData] = useState({})
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility)
  const [initialColumnFilters, setInitialColumnFilters] = useState([])

  // Off-canvas + custom-component + dialog state.
  const [offcanvasVisible, setOffcanvasVisible] = useState(false)
  const [offCanvasData, setOffCanvasData] = useState({})
  const [offCanvasRowIndex, setOffCanvasRowIndex] = useState(0)
  const [filteredRows, setFilteredRows] = useState([])
  const [customComponentData, setCustomComponentData] = useState({})
  const [customComponentVisible, setCustomComponentVisible] = useState(false)
  const [actionData, setActionData] = useState({ data: {}, action: {}, ready: false })

  const filterTypeMap = useMemo(() => {
    if (!filters || !Array.isArray(filters)) return {}
    return filters.reduce((acc, filter) => {
      if (filter.value && Array.isArray(filter.value)) {
        filter.value.forEach((v) => {
          if (v.id && filter.filterType) acc[v.id] = filter.filterType
        })
      }
      return acc
    }, {})
  }, [filters])

  const filtersInitializedRef = useRef(false)
  const previousFiltersRef = useRef(null)
  const prevSchemaKeyRef = useRef('')
  const prevDataRef = useRef(data)

  const waitingBool = !!api?.url
  const getRequestData = ApiGetCallWithPagination({
    url: api.url,
    data: { ...api.data },
    queryKey: queryKey ? queryKey : title,
    waiting: waitingBool,
    ...graphFilterData,
  })

  // ── Preset filters → initial columnFilters (mirrors prior behaviour) ──────
  useEffect(() => {
    const filtersChanged = !isEqual(filters, previousFiltersRef.current)
    if (
      filters &&
      Array.isArray(filters) &&
      filters.length > 0 &&
      (!filtersInitializedRef.current || filtersChanged)
    ) {
      const columnFormatFilters = filters.filter((f) => f.id !== undefined)
      if (columnFormatFilters.length > 0) {
        const processed = columnFormatFilters.map((filter) => {
          if (filter.filterType === 'equal') {
            return { ...filter, value: Array.isArray(filter.value) ? filter.value : [filter.value] }
          }
          return filter
        })
        setInitialColumnFilters(processed)
      }
      filtersInitializedRef.current = true
      previousFiltersRef.current = filters
    }
  }, [filters])

  // ── Static `data` prop → usedData (when not API-driven) ───────────────────
  useEffect(() => {
    if (Array.isArray(data) && !api?.url) {
      if (data !== prevDataRef.current) {
        prevDataRef.current = data
        setUsedData(data)
      }
    }
  }, [data, api?.url])

  // ── Infinite pagination loop while `nextLink` exists ──────────────────────
  useEffect(() => {
    if (getRequestData.isSuccess && !getRequestData.isFetching) {
      const lastPage = getRequestData.data?.pages[getRequestData.data.pages.length - 1]
      if (lastPage?.Metadata?.nextLink) getRequestData.fetchNextPage()
    }
  }, [getRequestData.data?.pages?.length, getRequestData.isFetching, queryKey])

  // ── Flatten API pages into usedData ───────────────────────────────────────
  useEffect(() => {
    if (getRequestData.isSuccess) {
      const allPages = getRequestData.data.pages
      const combined = allPages.flatMap((page) => {
        const nested = getNestedValue(page, api.dataKey)
        return nested !== undefined ? nested : []
      })
      setUsedData(dataFilter ? combined.filter(dataFilter) : combined)
    }
  }, [getRequestData.isSuccess, getRequestData.data, api.dataKey, getRequestData.isFetching, queryKey])

  // ── Derive columns from data + apply visibility, AllTenants tenant col ────
  useEffect(() => {
    if (
      !Array.isArray(usedData) ||
      usedData.length === 0 ||
      typeof usedData[0] !== 'object' ||
      usedData === null ||
      usedData === undefined
    ) {
      return
    }

    const schemaKey = computeSchemaKey(usedData)
    if (schemaKey === prevSchemaKeyRef.current && usedColumns.length > 0) return
    prevSchemaKeyRef.current = schemaKey

    const apiColumns = utilColumnsFromAPI(usedData)
    // Map `filterType: 'equal'` from preset filters → TanStack `equals` filterFn.
    const enhancedApiColumns = apiColumns.map((col) =>
      filterTypeMap[col.id] === 'equal' ? { ...col, filterFn: 'equals' } : col
    )

    const isAllTenants = settings?.currentTenant === 'AllTenants'
    const hasTenantProperty = usedData.some(
      (row) => row && typeof row === 'object' && 'Tenant' in row
    )
    const shouldShowTenant = isAllTenants && hasTenantProperty

    let finalColumns = []
    let newVisibility = { ...columnVisibility }

    if (columns.length === 0 && configuredSimpleColumns.length === 0) {
      finalColumns = enhancedApiColumns
      enhancedApiColumns.forEach((col) => {
        newVisibility[col.id] = true
      })
    } else if (configuredSimpleColumns.length > 0) {
      const resolvedSimpleColumns = resolveSimpleColumnVariables(configuredSimpleColumns, usedData)
      let finalResolved = [...resolvedSimpleColumns]
      if (shouldShowTenant && !resolvedSimpleColumns.includes('Tenant')) {
        finalResolved = [...resolvedSimpleColumns, 'Tenant']
      }
      finalColumns = enhancedApiColumns
      finalColumns.forEach((col) => {
        if (col.id !== undefined) newVisibility[col.id] = finalResolved.includes(col.id)
      })
    } else {
      const providedColumnKeys = new Set(columns.map((col) => col.id || col.header))
      finalColumns = [
        ...columns,
        ...enhancedApiColumns.filter((col) => !providedColumnKeys.has(col.id)),
      ]
      finalColumns.forEach((col) => {
        const key = col.id ?? col.accessorKey
        if (key !== undefined) newVisibility[key] = providedColumnKeys.has(col.id)
      })
      if (shouldShowTenant) {
        const tenantColumn = finalColumns.find((col) => col.id === 'Tenant')
        if (tenantColumn) newVisibility['Tenant'] = true
      }
    }

    setUsedColumns(finalColumns)
    setColumnVisibility(newVisibility)
  }, [columns.length, usedData, queryKey, settings?.currentTenant, filterTypeMap])

  // Sync simpleColumns prop change.
  useEffect(() => {
    if (Array.isArray(simpleColumns) && simpleColumns.length > 0) {
      setConfiguredSimpleColumns(simpleColumns)
    }
  }, [simpleColumns])

  // ── Build internal selection / actions columns ────────────────────────────
  const modeInfo = useMemo(
    () =>
      utilTableMode(
        columnVisibility,
        simple,
        actions,
        configuredSimpleColumns,
        offCanvas,
        onChange,
        maxHeightOffset,
        settings
      ),
    [simple, !!actions, !!offCanvas, !!onChange, maxHeightOffset, settings?.tablePageSize?.value]
  )

  const createDialog = useDialog()

  const handleOpenOffCanvas = useCallback(
    (rowData) => {
      setOffCanvasData(rowData)
      // Index lookup happens inside the row click path where we have access to the table.
      setOffcanvasVisible(true)
    },
    []
  )

  const augmentedColumns = useMemo(() => {
    const cols = [...usedColumns]
    if (modeInfo.enableRowSelection) {
      cols.unshift({
        id: '__cipp-row-select',
        header: ({ table }) => (
          <CippSelectAllHeader table={table} mode={modeInfo.selectAllMode} />
        ),
        cell: ({ row }) => <CippSelectionCell row={row} />,
        size: 48,
        minSize: 48,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        meta: { isInternal: true },
      })
    }
    if (modeInfo.enableRowActions || offCanvas) {
      cols.push({
        id: '__cipp-row-actions',
        header: '',
        cell: ({ row, table }) => (
          <CippRowActionsCell
            row={row}
            actions={actions}
            offCanvas={offCanvas}
            onBeforeAction={(rowData) => {
              if (settings.currentTenant === 'AllTenants' && rowData?.Tenant) {
                settings.handleUpdate({ currentTenant: rowData.Tenant })
              }
            }}
            onCustomComponent={({ data, action }) => {
              setCustomComponentData({ data, action })
              setCustomComponentVisible(true)
            }}
            onOpenDialog={({ data, action }) => {
              setActionData({ data, action, ready: true })
              createDialog.handleOpen()
            }}
            onOpenOffCanvas={(rowData) => {
              setOffCanvasData(rowData)
              const filteredRowsArray = table.getFilteredRowModel().rows
              const indexInFiltered = filteredRowsArray.findIndex((r) => r.original === rowData)
              setOffCanvasRowIndex(indexInFiltered >= 0 ? indexInFiltered : 0)
              setOffcanvasVisible(true)
            }}
          />
        ),
        size: 60,
        minSize: 60,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        meta: { isInternal: true },
      })
    }
    return cols
  }, [usedColumns, modeInfo.enableRowSelection, modeInfo.enableRowActions, modeInfo.selectAllMode, actions, offCanvas, settings, createDialog])

  // Sanitize columnVisibility to remove invalid keys.
  const sanitizedColumnVisibility = useMemo(() => {
    const result = {}
    for (const key of Object.keys(columnVisibility)) {
      if (key !== 'undefined' && key !== undefined) result[key] = columnVisibility[key]
    }
    return result
  }, [columnVisibility])

  // ── License backfill triggers re-render so memoizedData is keyed on it ────
  const { updateTrigger } = useLicenseBackfill()
  const memoizedData = useMemo(() => usedData, [usedData, updateTrigger])

  // ── Spin up the TanStack table ────────────────────────────────────────────
  const { table, state, setters, options } = useCippTable({
    data: Array.isArray(memoizedData) ? memoizedData : [],
    columns: augmentedColumns,
    initialState: modeInfo.initialState,
    enableRowSelection: !!modeInfo.enableRowSelection,
    enableSelectAll: modeInfo.enableSelectAll !== false,
    enableRowActions: !!modeInfo.enableRowActions,
    enableFacetedValues: modeInfo.enableFacetedValues !== false,
    enableColumnPinning: !!modeInfo.enableColumnPinning,
    enableStickyHeader: !!modeInfo.enableStickyHeader,
    enableColumnFilterModes: !!modeInfo.enableColumnFilterModes,
    selectAllMode: modeInfo.selectAllMode || 'all',
    rowsPerPageOptions: modeInfo.rowsPerPageOptions,
    maxHeight: modeInfo.maxHeight,
    defaultSorting,
    initialColumnFilters,
    initialColumnVisibility: sanitizedColumnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
  })

  // Sync external columnVisibility state down into the table when our orchestrator
  // recomputes it (AllTenants/Tenant column toggles, simpleColumns changes, etc.).
  useEffect(() => {
    table.setColumnVisibility(sanitizedColumnVisibility)
  }, [sanitizedColumnVisibility])

  // Apply initial column filters (preset toolbar buttons) once after table mount.
  const appliedInitialFiltersRef = useRef(false)
  useEffect(() => {
    if (initialColumnFilters.length > 0 && !appliedInitialFiltersRef.current) {
      table.setColumnFilters(initialColumnFilters)
      appliedInitialFiltersRef.current = true
    }
  }, [initialColumnFilters])

  // onChange → emit selected rows.
  useEffect(() => {
    if (onChange) {
      const rows = table.getSelectedRowModel().rows
      onChange(rows.map((row) => row.original))
    }
  }, [state.rowSelection])

  // Filtered-rows array for off-canvas up/down navigation.
  useEffect(() => {
    const rows = table.getFilteredRowModel().rows
    setFilteredRows(rows.map((row) => row.original))
  }, [state.columnFilters, state.globalFilter, state.sorting, memoizedData])

  // Row-click handler for off-canvas drawer.
  const muiTableBodyRowProps = useCallback(
    ({ row }) => {
      if (!offCanvasOnRowClick || !offCanvas) return null
      return {
        onClick: (event) => {
          if (
            event.target?.closest?.(
              'button, a, input, textarea, select, [role="button"], [role="menuitem"], [data-no-row-click="true"]'
            )
          )
            return
          setOffCanvasData(row.original)
          const filteredRowsArray = table.getFilteredRowModel().rows
          const idx = filteredRowsArray.findIndex((r) => r.original === row.original)
          setOffCanvasRowIndex(idx >= 0 ? idx : 0)
          setOffcanvasVisible(true)
        },
        sx: { cursor: 'pointer' },
      }
    },
    [offCanvasOnRowClick, offCanvas, table]
  )

  // Show skeletons during initial fetch (but not while paging next pages).
  const showSkeletons = getRequestData.isFetchingNextPage
    ? false
    : getRequestData.isFetching
      ? getRequestData.isFetching
      : isFetching

  // Empty-state fallback (queue message).
  const queueMessage = getRequestData.data?.pages?.[0]?.Metadata?.QueueMessage
  const emptyFallback = queueMessage ? (
    <Box sx={{ py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
      <Info /> {queueMessage}
    </Box>
  ) : undefined

  // ── Render ────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef(null)

  const renderTable = () => (
    <>
      {!simple && (
        <CIPPTableToptoolbar
          table={table}
          api={api}
          queryKey={queryKey}
          simpleColumns={simpleColumns}
          data={data}
          columnVisibility={sanitizedColumnVisibility}
          getRequestData={getRequestData}
          usedColumns={usedColumns}
          usedData={memoizedData ?? []}
          title={title}
          actions={actions}
          exportEnabled={exportEnabled}
          refreshFunction={refreshFunction}
          setColumnVisibility={setColumnVisibility}
          filters={filters}
          queryKeys={queryKey ? queryKey : title}
          graphFilterData={graphFilterData}
          setGraphFilterData={setGraphFilterData}
          setConfiguredSimpleColumns={setConfiguredSimpleColumns}
          queueMetadata={getRequestData.data?.pages?.[0]?.Metadata}
          isInDialog={isInDialog}
          showBulkExportAction={showBulkExportAction}
        />
      )}
      <CippTableShell
        isFullScreen={state.isFullScreen}
        sidebarCollapsed={settings?.sidebarCollapse}
        maxHeight={options.maxHeight}
        scrollContainerRef={scrollContainerRef}
      >
        <CippTableEl table={table}>
          <CippTableHead
            table={table}
            showColumnFilters={state.showColumnFilters}
            sticky={options.enableStickyHeader}
            enableModes={options.enableColumnFilterModes}
          />
          <CippTableBody
            table={table}
            scrollContainerRef={scrollContainerRef}
            showSkeletons={showSkeletons}
            emptyFallback={emptyFallback}
            onRowClick={muiTableBodyRowProps}
          />
        </CippTableEl>
      </CippTableShell>
      <CippTablePagination table={table} rowsPerPageOptions={options.rowsPerPageOptions} />
    </>
  )

  const tableBlock = !Array.isArray(usedData) && usedData ? (
    <ResourceUnavailable message={incorrectDataMessage} />
  ) : (
    <>
      {(getRequestData.isSuccess ||
        getRequestData.data?.pages.length >= 0 ||
        (data && !getRequestData.isError)) &&
        renderTable()}
    </>
  )

  return (
    <>
      {noCard ? (
        <Scrollbar>
          {tableBlock}
          {getRequestData.isError && !getRequestData.isFetchNextPageError && (
            <ResourceError
              onReload={() => getRequestData.refetch()}
              message={`Error Loading data:  ${getCippError(getRequestData.error)}`}
            />
          )}
        </Scrollbar>
      ) : (
        <Card style={{ width: '100%' }} {...props.cardProps}>
          {cardButton || !hideTitle ? (
            <>
              <CardHeader
                action={cardButton}
                title={hideTitle ? '' : title}
                {...props.cardHeaderProps}
              />
              <Divider />
            </>
          ) : null}
          <CardContent sx={{ padding: '1rem' }}>
            <Scrollbar>
              {tableBlock}
              {getRequestData.isError && !getRequestData.isFetchNextPageError && (
                <ResourceError
                  onReload={() => getRequestData.refetch()}
                  message={`Error Loading data:  ${getCippError(getRequestData.error)}`}
                />
              )}
            </Scrollbar>
          </CardContent>
        </Card>
      )}

      <CippOffCanvas
        isFetching={getRequestData.isFetching}
        visible={offcanvasVisible}
        onClose={() => setOffcanvasVisible(false)}
        extendedData={offCanvasData}
        extendedInfoFields={offCanvas?.extendedInfoFields}
        actions={actions}
        title={offCanvasData?.Name || offCanvas?.title || 'Extended Info'}
        children={
          offCanvas?.children ? (row) => offCanvas.children(row, offCanvasRowIndex) : undefined
        }
        customComponent={offCanvas?.customComponent}
        onNavigateUp={() => {
          const newIndex = offCanvasRowIndex - 1
          if (newIndex >= 0 && filteredRows && filteredRows[newIndex]) {
            setOffCanvasRowIndex(newIndex)
            setOffCanvasData(filteredRows[newIndex])
          }
        }}
        onNavigateDown={() => {
          const newIndex = offCanvasRowIndex + 1
          if (filteredRows && newIndex < filteredRows.length) {
            setOffCanvasRowIndex(newIndex)
            setOffCanvasData(filteredRows[newIndex])
          }
        }}
        canNavigateUp={offCanvasRowIndex > 0}
        canNavigateDown={filteredRows && offCanvasRowIndex < filteredRows.length - 1}
        {...offCanvas}
      />

      {customComponentVisible &&
        customComponentData?.action &&
        typeof customComponentData.action.customComponent === 'function' &&
        customComponentData.action.customComponent(customComponentData.data, {
          drawerVisible: customComponentVisible,
          setDrawerVisible: setCustomComponentVisible,
          fromRowAction: true,
        })}

      {actionData.ready &&
        !(actionData.action && typeof actionData.action.customComponent === 'function') && (
          <CippApiDialog
            createDialog={createDialog}
            title="Confirmation"
            fields={actionData.action?.fields}
            api={actionData.action}
            row={actionData.data}
            relatedQueryKeys={queryKey ? queryKey : title}
            {...actionData.action}
          />
        )}
    </>
  )
}
