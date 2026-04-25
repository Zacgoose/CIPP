import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material'
import Grid from '@mui/system/Grid'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { Layout as DashboardLayout } from '../../../../layouts/index.js'
import { TabbedLayout } from '../../../../layouts/TabbedLayout.jsx'
import { CippChartCard } from '../../../../components/CippCards/CippChartCard.jsx'
import CippFormComponent from '../../../../components/CippComponents/CippFormComponent'
import { ApiGetCall } from '../../../../api/ApiCall.jsx'
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

  const reports = ApiGetCall({
    url: '/api/ListDmarcReports',
    data: { tenantFilter: currentTenant, StartDate: startDate, EndDate: endDate },
    queryKey: `ListDmarcReports-dashboard-${currentTenant}-${startDate}-${endDate}`,
  })

  const config = ApiGetCall({
    url: '/api/ListDmarcConfig',
    data: { tenantFilter: currentTenant },
    queryKey: `ListDmarcConfig-dashboard-${currentTenant}`,
  })

  const isFetching = reports.isFetching || config.isFetching
  const records = reports.data ?? []
  const tenantConfig = Array.isArray(config.data) ? config.data[0] : config.data

  const stats = useMemo(() => {
    if (!records.length) {
      return {
        totalMessages: 0,
        totalRecords: records.length,
        passCount: 0,
        failCount: 0,
        dispositions: { none: 0, quarantine: 0, reject: 0 },
        spfPass: 0,
        spfFail: 0,
        dkimPass: 0,
        dkimFail: 0,
        topSources: [],
        topFailSources: [],
        reportingOrgs: [],
        trendSeries: [],
        volumeSeries: [],
      }
    }

    let totalMessages = 0
    let passCount = 0
    let failCount = 0
    let spfPass = 0
    let spfFail = 0
    let dkimPass = 0
    let dkimFail = 0
    const dispositions = { none: 0, quarantine: 0, reject: 0 }
    const sourceMap = {}
    const failSourceMap = {}
    const orgSet = new Set()
    const dayPassMap = {}
    const dayFailMap = {}

    records.forEach((r) => {
      const count = Number(r.MessageCount) || 1
      totalMessages += count

      if (r.DMARCResult === 'pass') {
        passCount += count
      } else {
        failCount += count
      }

      if (r.SPFResult === 'pass') spfPass += count
      else spfFail += count

      if (r.DKIMResult === 'pass') dkimPass += count
      else dkimFail += count

      const disp = (r.Disposition || 'none').toLowerCase()
      dispositions[disp] = (dispositions[disp] || 0) + count

      const ip = r.SourceIP || 'Unknown'
      sourceMap[ip] = (sourceMap[ip] || 0) + count
      if (r.DMARCResult !== 'pass') {
        failSourceMap[ip] = (failSourceMap[ip] || 0) + count
      }

      if (r.ReportingOrg) orgSet.add(r.ReportingOrg)

      // Group by day for time-series
      const dateStr = r.DateRangeStart
        ? new Date(
            typeof r.DateRangeStart === 'number'
              ? r.DateRangeStart * 1000
              : r.DateRangeStart
          )
            .toISOString()
            .slice(0, 10)
        : null
      if (dateStr) {
        if (r.DMARCResult === 'pass') {
          dayPassMap[dateStr] = (dayPassMap[dateStr] || 0) + count
        } else {
          dayFailMap[dateStr] = (dayFailMap[dateStr] || 0) + count
        }
      }
    })

    const topSources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topFailSources = Object.entries(failSourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Build time-series sorted by date
    const allDays = [...new Set([...Object.keys(dayPassMap), ...Object.keys(dayFailMap)])].sort()
    const trendSeries = [
      {
        name: 'Pass',
        data: allDays.map((d) => ({ x: d, y: dayPassMap[d] || 0 })),
      },
      {
        name: 'Fail',
        data: allDays.map((d) => ({ x: d, y: dayFailMap[d] || 0 })),
      },
    ]
    const volumeSeries = [
      {
        name: 'Messages',
        data: allDays.map((d) => ({ x: d, y: (dayPassMap[d] || 0) + (dayFailMap[d] || 0) })),
      },
    ]

    return {
      totalMessages,
      totalRecords: records.length,
      passCount,
      failCount,
      dispositions,
      spfPass,
      spfFail,
      dkimPass,
      dkimFail,
      topSources,
      topFailSources,
      reportingOrgs: [...orgSet],
      trendSeries,
      volumeSeries,
    }
  }, [records])

  const passRate = stats.totalMessages
    ? ((stats.passCount / stats.totalMessages) * 100).toFixed(1)
    : 0

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        DMARC Reports Dashboard
      </Typography>

      {/* Date range filter */}
      <Box sx={{ mb: 3 }}>
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
      </Box>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            title="Total Messages"
            value={stats.totalMessages.toLocaleString()}
            isFetching={isFetching}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            title="DMARC Pass Rate"
            value={`${passRate}%`}
            color={Number(passRate) >= 95 ? 'success.main' : Number(passRate) >= 80 ? 'warning.main' : 'error.main'}
            isFetching={isFetching}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            title="Report Records"
            value={stats.totalRecords.toLocaleString()}
            isFetching={isFetching}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            title="Reporting Orgs"
            value={stats.reportingOrgs.length.toString()}
            isFetching={isFetching}
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <CippChartCard
            title="DMARC Results"
            isFetching={isFetching}
            chartType="donut"
            totalLabel="Total Messages"
            customTotal={stats.totalMessages}
            chartSeries={[stats.passCount, stats.failCount]}
            labels={[
              `Pass (${stats.passCount.toLocaleString()})`,
              `Fail (${stats.failCount.toLocaleString()})`,
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <CippChartCard
            title="Disposition"
            isFetching={isFetching}
            chartType="donut"
            totalLabel="Total Messages"
            customTotal={stats.totalMessages}
            chartSeries={[
              stats.dispositions.none || 0,
              stats.dispositions.quarantine || 0,
              stats.dispositions.reject || 0,
            ]}
            labels={[
              `None (${(stats.dispositions.none || 0).toLocaleString()})`,
              `Quarantine (${(stats.dispositions.quarantine || 0).toLocaleString()})`,
              `Reject (${(stats.dispositions.reject || 0).toLocaleString()})`,
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <CippChartCard
            title="Authentication"
            isFetching={isFetching}
            chartType="bar"
            chartSeries={[stats.spfPass, stats.spfFail, stats.dkimPass, stats.dkimFail]}
            labels={['SPF Pass', 'SPF Fail', 'DKIM Pass', 'DKIM Fail']}
          />
        </Grid>
      </Grid>

      {/* Time-series charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <CippChartCard
            title="DMARC Results Over Time"
            isFetching={isFetching}
            chartType="area"
            chartSeries={stats.trendSeries}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <CippChartCard
            title="Message Volume"
            isFetching={isFetching}
            chartType="area"
            chartSeries={stats.volumeSeries}
          />
        </Grid>
      </Grid>

      {/* Top sources */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Top Sending Sources" />
            <Divider />
            <CardContent>
              {isFetching ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : stats.topSources.length === 0 ? (
                <Typography color="text.secondary">No data available</Typography>
              ) : (
                <Stack spacing={1}>
                  {stats.topSources.map(([ip, count]) => (
                    <Stack
                      key={ip}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {ip}
                      </Typography>
                      <Chip
                        label={`${count.toLocaleString()} messages`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Top Failing Sources" />
            <Divider />
            <CardContent>
              {isFetching ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : stats.topFailSources.length === 0 ? (
                <Typography color="text.secondary">No failing sources</Typography>
              ) : (
                <Stack spacing={1}>
                  {stats.topFailSources.map(([ip, count]) => (
                    <Stack
                      key={ip}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {ip}
                      </Typography>
                      <Chip
                        label={`${count.toLocaleString()} messages`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tenant config status */}
      {tenantConfig && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardHeader title="Configuration Status" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">
                    <Chip
                      label={tenantConfig.Status}
                      size="small"
                      color={tenantConfig.Status === 'Active' ? 'success' : 'warning'}
                    />
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Mailbox
                  </Typography>
                  <Typography variant="body2">{tenantConfig.MailboxAddress}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Domains Configured
                  </Typography>
                  <Typography variant="body1">{tenantConfig.DomainCount ?? 0}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Post-Process Action
                  </Typography>
                  <Typography variant="body1">{tenantConfig.PostProcessAction}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}

const SummaryCard = ({ title, value, color, isFetching }) => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ color: color || 'text.primary', mt: 0.5 }}>
        {isFetching ? '...' : value}
      </Typography>
    </CardContent>
  </Card>
)

Page.getLayout = (page) => (
  <DashboardLayout>
    <TabbedLayout tabOptions={tabOptions}>{page}</TabbedLayout>
  </DashboardLayout>
)

export default Page
