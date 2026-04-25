import { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material'
import { Grid } from '@mui/system'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { CippTablePage } from '../../../../components/CippComponents/CippTablePage.jsx'
import CippFormComponent from '../../../../components/CippComponents/CippFormComponent'
import { Layout as DashboardLayout } from '../../../../layouts/index.js'
import { TabbedLayout } from '../../../../layouts/TabbedLayout.jsx'
import { useSettings } from '../../../../hooks/use-settings'
import tabOptions from './tabOptions'

const defaultStartDate = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
})()

const fmtDate = (yyyymmdd) =>
  yyyymmdd
    ? new Date(
        yyyymmdd.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T00:00:00'
      ).toLocaleDateString()
    : null

const Page = () => {
  const currentTenant = useSettings().currentTenant

  const formControl = useForm({ defaultValues: { startDate: defaultStartDate, endDate: null } })
  const [expanded, setExpanded] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(defaultStartDate * 1000).toISOString().split('T')[0].replace(/-/g, '')
  )
  const [endDate, setEndDate] = useState(null)

  const onSubmit = (data) => {
    setStartDate(
      data.startDate
        ? new Date(data.startDate * 1000).toISOString().split('T')[0].replace(/-/g, '')
        : null
    )
    setEndDate(
      data.endDate
        ? new Date(data.endDate * 1000).toISOString().split('T')[0].replace(/-/g, '')
        : null
    )
    setExpanded(false)
  }

  const clearFilters = () => {
    formControl.reset({ startDate: defaultStartDate, endDate: null })
    setStartDate(
      new Date(defaultStartDate * 1000).toISOString().split('T')[0].replace(/-/g, '')
    )
    setEndDate(null)
    setExpanded(false)
  }

  const tableFilter = (
    <Accordion expanded={expanded} onChange={(_, v) => setExpanded(v)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SvgIcon fontSize="small">
            <FunnelIcon />
          </SvgIcon>
          <Typography variant="body2">
            {startDate || endDate
              ? startDate && endDate
                ? `Date Filter: ${fmtDate(startDate)} — ${fmtDate(endDate)}`
                : startDate
                  ? `Date Filter: From ${fmtDate(startDate)}`
                  : `Date Filter: Up to ${fmtDate(endDate)}`
              : 'Date Filter: Last 30 days'}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid size={{ xs: 12, md: 4 }}>
            <CippFormComponent
              type="datePicker"
              name="startDate"
              label="Start Date"
              dateTimeType="date"
              formControl={formControl}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <CippFormComponent
              type="datePicker"
              name="endDate"
              label="End Date"
              dateTimeType="date"
              formControl={formControl}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={formControl.handleSubmit(onSubmit)}>
                Apply
              </Button>
              <Button
                variant="outlined"
                startIcon={
                  <SvgIcon fontSize="small">
                    <XMarkIcon />
                  </SvgIcon>
                }
                onClick={clearFilters}
              >
                Reset
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  )

  const simpleColumns = [
    'ReportingOrg',
    'PolicyDomain',
    'HeaderFrom',
    'SourceIP',
    'MessageCount',
    'DMARCResult',
    'SPFResult',
    'DKIMResult',
    'Disposition',
    'PolicyPublished',
    'DateRangeStart',
    'DateRangeEnd',
    'SPFDomain',
    'DKIMDomain',
  ]

  return (
    <CippTablePage
      title="DMARC Report Data"
      tenantInTitle={false}
      apiUrl="/api/ListDmarcReports"
      queryKey={`ListDmarcReports-table-${currentTenant}-${startDate}-${endDate}`}
      apiData={{ StartDate: startDate, EndDate: endDate }}
      simpleColumns={simpleColumns}
      tableFilter={tableFilter}
    />
  )
}

Page.getLayout = (page) => (
  <DashboardLayout>
    <TabbedLayout tabOptions={tabOptions}>{page}</TabbedLayout>
  </DashboardLayout>
)

export default Page
