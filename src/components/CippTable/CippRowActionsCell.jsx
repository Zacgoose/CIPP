import { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, SvgIcon } from '@mui/material'
import { MoreVert, MoreHoriz, More } from '@mui/icons-material'

// Per-row action menu. Mirrors the renderRowActionMenuItems flow from the old
// CippDataTable: `actions` is an array of objects with
//   { label, icon, color, condition?, noConfirm?, customFunction?, customComponent?, ... }
// On click:
//   - customComponent  → opens via onCustomComponent({ data, action })
//   - noConfirm + customFunction → invokes the function directly
//   - else → opens the confirmation dialog via onOpenDialog({ data, action })
// If `offCanvas` is provided a "More Info" entry is appended that calls onOpenOffCanvas.
// `onMenuItemClicked` runs first so "AllTenants" mode can swap the current tenant.
export const CippRowActionsCell = ({
  row,
  actions,
  offCanvas,
  onOpenDialog,
  onCustomComponent,
  onOpenOffCanvas,
  onBeforeAction,
}) => {
  const [anchor, setAnchor] = useState(null)
  const closeMenu = () => setAnchor(null)

  if (!actions && !offCanvas) return null

  const isDisabled = (action) =>
    typeof action?.condition === 'function' ? !action.condition(row.original) : false

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        {Array.isArray(actions) &&
          actions.map((action, idx) => (
            <MenuItem
              key={`action-${idx}`}
              sx={{ color: action.color }}
              disabled={isDisabled(action)}
              onClick={() => {
                onBeforeAction?.(row.original, action)
                if (action.noConfirm && action.customFunction) {
                  action.customFunction(row.original, action, {})
                  closeMenu()
                  return
                }
                if (typeof action.customComponent === 'function') {
                  onCustomComponent?.({ data: row.original, action })
                  closeMenu()
                  return
                }
                onOpenDialog?.({ data: row.original, action })
                closeMenu()
              }}
            >
              <ListItemIcon sx={{ minWidth: 30 }}>
                <SvgIcon fontSize="small">{action.icon}</SvgIcon>
              </ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
        {offCanvas && (
          <MenuItem
            onClick={() => {
              onOpenOffCanvas?.(row.original)
              closeMenu()
            }}
          >
            <ListItemIcon>
              {Array.isArray(actions) && actions.length > 0 ? (
                <MoreHoriz fontSize="small" />
              ) : (
                <More fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>More Info</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
