import { useState, useEffect, useMemo, useRef } from 'react'
import {
  TextField,
  Autocomplete,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'
import { MoreVert } from '@mui/icons-material'

const COLUMN_FILTER_MODES = [
  { option: 'contains', label: 'Contains', symbol: '*' },
  { option: 'equals', label: 'Equals', symbol: '=' },
  { option: 'notContains', label: 'Not Contains', symbol: '!*' },
  { option: 'regex', label: 'Regex', symbol: '(.*)' },
]

// Debounced text input — defers the (potentially expensive) setFilterValue call.
const useDebounced = (value, onChange, delay = 250) => {
  const [local, setLocal] = useState(value ?? '')
  const timer = useRef(null)
  useEffect(() => {
    setLocal(value ?? '')
  }, [value])
  const handle = (next) => {
    setLocal(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next), delay)
  }
  useEffect(() => () => timer.current && clearTimeout(timer.current), [])
  return [local, handle]
}

// Per-column filter row cell. Switches on `column.columnDef.meta.filterVariant`.
export const CippColumnFilter = ({ column, table, enableModes = true }) => {
  const meta = column.columnDef.meta || {}
  const variant = meta.filterVariant || 'text'
  const value = column.getFilterValue()
  const setValue = (v) => column.setFilterValue(v)

  const [modeAnchor, setModeAnchor] = useState(null)

  const facetedUnique = useMemo(() => {
    if (variant === 'select' || variant === 'multi-select') {
      const map = column.getFacetedUniqueValues?.()
      if (map && map.size) {
        return [...map.keys()].filter((k) => k !== null && k !== undefined && k !== '').sort()
      }
    }
    return []
  }, [column, variant])

  const options = useMemo(() => {
    if (Array.isArray(meta.filterSelectOptions) && meta.filterSelectOptions.length > 0) {
      return meta.filterSelectOptions.map((o) =>
        typeof o === 'string' ? { label: o, value: o } : o
      )
    }
    return facetedUnique.map((v) => ({ label: String(v), value: v }))
  }, [meta.filterSelectOptions, facetedUnique])

  const modeMenu =
    enableModes && variant === 'text' ? (
      <>
        <IconButton size="small" onClick={(e) => setModeAnchor(e.currentTarget)} sx={{ p: 0.25 }}>
          <MoreVert fontSize="inherit" />
        </IconButton>
        <Menu
          anchorEl={modeAnchor}
          open={Boolean(modeAnchor)}
          onClose={() => setModeAnchor(null)}
        >
          {COLUMN_FILTER_MODES.map((m) => (
            <MenuItem
              key={m.option}
              onClick={() => {
                column.columnDef.filterFn = m.option
                table.setColumnFilters((prev) => prev.map((f) => ({ ...f })))
                setModeAnchor(null)
              }}
            >
              <span style={{ width: 20, textAlign: 'center' }}>{m.symbol}</span>
              <ListItemText>{m.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </>
    ) : null

  if (variant === 'select') {
    return (
      <Autocomplete
        size="small"
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.label ?? '')}
        value={options.find((o) => o.value === value) || null}
        onChange={(_, picked) => setValue(picked ? picked.value : undefined)}
        renderInput={(params) => <TextField {...params} placeholder="Filter" variant="standard" />}
      />
    )
  }

  if (variant === 'multi-select') {
    const arr = Array.isArray(value) ? value : []
    return (
      <Autocomplete
        size="small"
        multiple
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.label ?? '')}
        value={options.filter((o) => arr.includes(o.value))}
        onChange={(_, picked) => setValue(picked.length ? picked.map((p) => p.value) : undefined)}
        renderInput={(params) => <TextField {...params} placeholder="Filter" variant="standard" />}
      />
    )
  }

  if (variant === 'range') {
    const [min, max] = Array.isArray(value) ? value : ['', '']
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <TextField
          size="small"
          variant="standard"
          placeholder="Min"
          value={min ?? ''}
          onChange={(e) => setValue([e.target.value, max])}
          inputProps={{ inputMode: 'numeric' }}
        />
        <TextField
          size="small"
          variant="standard"
          placeholder="Max"
          value={max ?? ''}
          onChange={(e) => setValue([min, e.target.value])}
          inputProps={{ inputMode: 'numeric' }}
        />
      </Box>
    )
  }

  if (variant === 'datetime-range') {
    const [from, to] = Array.isArray(value) ? value : ['', '']
    // Ensure datetime filterFn is set so date-strings are compared correctly.
    if (column.columnDef.filterFn !== 'dateBetween') column.columnDef.filterFn = 'dateBetween'
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <TextField
          size="small"
          type="date"
          variant="standard"
          value={from ?? ''}
          onChange={(e) => setValue([e.target.value, to])}
        />
        <TextField
          size="small"
          type="date"
          variant="standard"
          value={to ?? ''}
          onChange={(e) => setValue([from, e.target.value])}
        />
      </Box>
    )
  }

  // Default: text
  return <TextRangeFilter value={value} onChange={setValue} modeMenu={modeMenu} />
}

const TextRangeFilter = ({ value, onChange, modeMenu }) => {
  const [local, setLocal] = useDebounced(value, onChange)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <TextField
        size="small"
        variant="standard"
        placeholder="Filter"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        fullWidth
      />
      {modeMenu}
    </Box>
  )
}
