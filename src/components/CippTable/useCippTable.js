import { useMemo, useState, useCallback, useRef } from 'react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  useReactTable,
} from '@tanstack/react-table'

// ── Custom sortingFns (null-safe, dotted-path aware) ─────────────────────────
const getNestedValue = (source, path) => {
  if (!source) return undefined
  if (!path) return source
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined
    if (typeof acc !== 'object') return undefined
    return acc[key]
  }, source)
}

const getRowValueByColumnId = (row, columnId) => {
  if (!row?.original || !columnId) return undefined
  if (columnId.includes('@odata')) return row.original[columnId]
  return getNestedValue(row.original, columnId)
}

const compareNullable = (aVal, bVal) => {
  if (aVal === null && bVal === null) return 0
  if (aVal === null) return 1
  if (bVal === null) return -1
  if (aVal === bVal) return 0
  return aVal > bVal ? 1 : -1
}

export const CIPP_SORTING_FNS = {
  dateTimeNullsLast: (a, b, id) => {
    const aRaw = getRowValueByColumnId(a, id)
    const bRaw = getRowValueByColumnId(b, id)
    const aDate = aRaw ? new Date(aRaw) : null
    const bDate = bRaw ? new Date(bRaw) : null
    const aTime = aDate && !Number.isNaN(aDate.getTime()) ? aDate.getTime() : null
    const bTime = bDate && !Number.isNaN(bDate.getTime()) ? bDate.getTime() : null
    return compareNullable(aTime, bTime)
  },
  number: (a, b, id) => {
    const aRaw = getRowValueByColumnId(a, id)
    const bRaw = getRowValueByColumnId(b, id)
    const aNum = typeof aRaw === 'number' ? aRaw : Number(aRaw)
    const bNum = typeof bRaw === 'number' ? bRaw : Number(bRaw)
    const aVal = Number.isNaN(aNum) ? null : aNum
    const bVal = Number.isNaN(bNum) ? null : bNum
    return compareNullable(aVal, bVal)
  },
  boolean: (a, b, id) => {
    const aRaw = getRowValueByColumnId(a, id)
    const bRaw = getRowValueByColumnId(b, id)
    const toBool = (v) => {
      if (v === null || v === undefined) return null
      if (typeof v === 'boolean') return v
      if (typeof v === 'string') {
        const s = v.toLowerCase()
        if (s === 'true' || s === 'yes') return true
        if (s === 'false' || s === 'no') return false
      }
      if (typeof v === 'number') return v !== 0
      return null
    }
    const aB = toBool(aRaw)
    const bB = toBool(bRaw)
    return compareNullable(aB === null ? null : aB ? 1 : 0, bB === null ? null : bB ? 1 : 0)
  },
}

// ── Custom filterFns ────────────────────────────────────────────────────────
export const CIPP_FILTER_FNS = {
  notContains: (row, columnId, value) => {
    const rowValue = row.getValue(columnId)
    if (rowValue === null || rowValue === undefined) return false
    const s = String(rowValue)
    if (s.includes('[object Object]') || !s.toLowerCase().includes(String(value).toLowerCase()))
      return true
    return false
  },
  regex: (row, columnId, value) => {
    try {
      const regex = new RegExp(value, 'i')
      const v = row.getValue(columnId)
      if (typeof v === 'string' && !v.includes('[object Object]')) return regex.test(v)
      return false
    } catch {
      return true
    }
  },
  // MRT-named aliases used by getCippFilterVariant — map to TanStack semantics.
  contains: (row, columnId, value) => {
    const v = row.getValue(columnId)
    if (v === null || v === undefined) return false
    return String(v).toLowerCase().includes(String(value).toLowerCase())
  },
  includes: (row, columnId, value) => {
    const v = row.getValue(columnId)
    if (v === null || v === undefined) return false
    return String(v).toLowerCase().includes(String(value).toLowerCase())
  },
  equals: (row, columnId, value) => {
    const v = row.getValue(columnId)
    if (value === null || value === undefined || value === '') return true
    if (Array.isArray(value)) {
      if (value.length === 0) return true
      return value.some((entry) => String(v) === String(entry))
    }
    return String(v) === String(value)
  },
  betweenInclusive: (row, columnId, value) => {
    if (!Array.isArray(value)) return true
    const [min, max] = value
    const raw = row.getValue(columnId)
    const num = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isNaN(num)) return false
    const minOk = min === '' || min === null || min === undefined || num >= Number(min)
    const maxOk = max === '' || max === null || max === undefined || num <= Number(max)
    return minOk && maxOk
  },
  // Date range — value is [fromISO, toISO] or [Date, Date]
  dateBetween: (row, columnId, value) => {
    if (!Array.isArray(value)) return true
    const [from, to] = value
    const raw = row.getValue(columnId)
    if (raw === null || raw === undefined || raw === '') return false
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) return false
    const fromOk = !from || t >= new Date(from).getTime()
    const toOk = !to || t <= new Date(to).getTime()
    return fromOk && toOk
  },
}

const GLOBAL_FILTER_FN = (row, columnId, value) => {
  if (!value) return true
  const v = row.getValue(columnId)
  if (v === null || v === undefined) return false
  return String(v).toLowerCase().includes(String(value).toLowerCase())
}

// ── Hook ────────────────────────────────────────────────────────────────────
// Owns: columnVisibility / columnFilters / sorting / globalFilter / rowSelection
//       / pagination / showColumnFilters / isFullScreen / columnSizing / pinning.
// Returns a `table` object augmented with the few setters the CIPP toolbar relies on
// that TanStack core does not expose natively (`setShowColumnFilters`,
// `setIsFullScreen`, and `state.{showColumnFilters,isFullScreen}` exposed via
// `table.getState()`).
export const useCippTable = ({
  data,
  columns,
  initialState = {},
  enableRowSelection = false,
  enableSelectAll = true,
  enableRowActions = false,
  enableFacetedValues = true,
  enableColumnPinning = true,
  enableStickyHeader = true,
  enableColumnFilterModes = true,
  enableColumnResizing = true,
  selectAllMode = 'all',
  rowsPerPageOptions = [25, 50, 100, 250, 500],
  maxHeight,
  defaultSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  onColumnVisibilityChange,
  onColumnFiltersChange,
  onSortingChange,
}) => {
  const [sorting, setSortingState] = useState(defaultSorting)
  const [columnFilters, setColumnFiltersState] = useState(initialColumnFilters)
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibilityState] = useState(initialColumnVisibility)
  const [columnSizing, setColumnSizing] = useState({})
  const [columnPinning, setColumnPinning] = useState(initialState.columnPinning || {})
  const [pagination, setPagination] = useState(
    initialState.pagination || { pageIndex: 0, pageSize: 25 }
  )
  const [showColumnFilters, setShowColumnFilters] = useState(
    initialState.showColumnFilters ?? false
  )
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Bubble controlled-state changes up so the orchestrator can persist them.
  const setSorting = useCallback(
    (updater) => {
      setSortingState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onSortingChange?.(next)
        return next
      })
    },
    [onSortingChange]
  )

  const setColumnFilters = useCallback(
    (updater) => {
      setColumnFiltersState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onColumnFiltersChange?.(next)
        return next
      })
    },
    [onColumnFiltersChange]
  )

  const setColumnVisibility = useCallback(
    (updater) => {
      setColumnVisibilityState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onColumnVisibilityChange?.(next)
        return next
      })
    },
    [onColumnVisibilityChange]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnSizing,
      columnPinning,
      pagination,
    },
    enableRowSelection,
    enableMultiRowSelection: enableRowSelection,
    enableColumnPinning,
    enableColumnResizing,
    columnResizeMode: 'onChange',
    enableFilters: true,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableSorting: true,
    enableHiding: true,
    sortingFns: CIPP_SORTING_FNS,
    filterFns: CIPP_FILTER_FNS,
    globalFilterFn: GLOBAL_FILTER_FN,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(enableFacetedValues
      ? {
          getFacetedRowModel: getFacetedRowModel(),
          getFacetedUniqueValues: getFacetedUniqueValues(),
          getFacetedMinMaxValues: getFacetedMinMaxValues(),
        }
      : {}),
    initialState,
  })

  // Augment table with MRT-shaped extras the toolbar relies on.
  const stateRef = useRef({ showColumnFilters, isFullScreen })
  stateRef.current = { showColumnFilters, isFullScreen }

  const originalGetState = table.getState
  table.getState = () => ({
    ...originalGetState.call(table),
    showColumnFilters: stateRef.current.showColumnFilters,
    isFullScreen: stateRef.current.isFullScreen,
  })
  table.setShowColumnFilters = (value) =>
    setShowColumnFilters((prev) => (typeof value === 'function' ? value(prev) : value))
  table.setIsFullScreen = (value) =>
    setIsFullScreen((prev) => (typeof value === 'function' ? value(prev) : value))

  return {
    table,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnSizing,
      columnPinning,
      pagination,
      showColumnFilters,
      isFullScreen,
    },
    setters: {
      setSorting,
      setColumnFilters,
      setGlobalFilter,
      setRowSelection,
      setColumnVisibility,
      setShowColumnFilters,
      setIsFullScreen,
      setPagination,
    },
    options: {
      enableRowSelection,
      enableSelectAll,
      enableRowActions,
      enableColumnPinning,
      enableStickyHeader,
      enableColumnFilterModes,
      enableColumnResizing,
      selectAllMode,
      rowsPerPageOptions,
      maxHeight,
    },
  }
}
