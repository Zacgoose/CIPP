import { Button, Chip } from '@mui/material'
import { CippTablePage } from '../../../components/CippComponents/CippTablePage.jsx'
import { Layout as DashboardLayout } from '../../../layouts/index.js'
import Link from 'next/link'
import { Add, Refresh, Dns, VerifiedUser, Delete, Edit, PlayArrow } from '@mui/icons-material'
import { useSettings } from '../../../hooks/use-settings'

const Page = () => {
  const currentTenant = useSettings().currentTenant

  const actions = [
    {
      label: 'Process Now',
      type: 'POST',
      url: '/api/ExecDmarcSetup',
      icon: <PlayArrow />,
      data: { Action: '!ProcessTenant', tenantFilter: 'TenantFilter' },
      confirmText: 'Start DMARC report processing for [TenantFilter]?',
      multiPost: false,
      condition: (row) => row.Status === 'Active',
    },
    {
      label: 'Edit Config',
      type: 'POST',
      url: '/api/ExecDmarcSetup',
      icon: <Edit />,
      data: { Action: '!UpdateConfig', tenantFilter: 'TenantFilter' },
      setDefaultValues: true,
      fields: [
        {
          type: 'textField',
          name: 'TenantFilter',
          label: 'Tenant',
          disabled: true,
        },
        {
          type: 'textField',
          name: 'DisplayName',
          label: 'Mailbox Display Name',
        },
        {
          type: 'autoComplete',
          name: 'PostProcessAction',
          label: 'Post-Process Action',
          multiple: false,
          creatable: false,
          options: [
            { label: 'Move to Processed folder', value: 'Move' },
            { label: 'Delete after processing', value: 'Delete' },
            { label: 'Keep in Inbox', value: 'Keep' },
          ],
        },
      ],
      confirmText: 'Update DMARC configuration for [TenantFilter]?',
      multiPost: false,
      color: 'info',
    },
    {
      label: 'Test Access',
      type: 'POST',
      url: '/api/ExecDmarcSetup',
      icon: <VerifiedUser />,
      data: { Action: '!TestAccess', tenantFilter: 'TenantFilter' },
      confirmText: 'Test DMARC mailbox access for [TenantFilter]?',
      multiPost: false,
    },
    {
      label: 'Validate DNS',
      type: 'POST',
      url: '/api/ExecDmarcSetup',
      icon: <Dns />,
      data: { Action: '!ValidateDns', tenantFilter: 'TenantFilter' },
      confirmText: 'Validate DMARC DNS records for [TenantFilter]?',
      multiPost: false,
    },
    {
      label: 'Remove DMARC',
      type: 'POST',
      url: '/api/ExecDmarcSetup',
      icon: <Delete />,
      data: { Action: '!Remove', tenantFilter: 'TenantFilter' },
      confirmText:
        'Are you sure you want to remove DMARC processing for [TenantFilter]? This will remove the shared mailbox and RBAC configuration.',
      multiPost: false,
      color: 'danger',
    },
  ]

  const simpleColumns = [
    'TenantFilter',
    'Status',
    'MailboxAddress',
    'DisplayName',
    'PostProcessAction',
    'DomainCount',
    'LastRunTime',
    'LastRunRecords',
    'LastRunErrors',
  ]

  return (
    <CippTablePage
      title="DMARC Configuration"
      tenantInTitle={false}
      apiUrl="/api/ListDmarcConfig"
      queryKey="ListDmarcConfig"
      simpleColumns={simpleColumns}
      actions={actions}
      cardButton={
        <>
          <Button component={Link} href="/email/dmarc/setup" startIcon={<Add />}>
            Enrol Tenant
          </Button>
          <Button component={Link} href="/email/dmarc/reports" startIcon={<Dns />}>
            View Reports
          </Button>
        </>
      }
    />
  )
}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default Page
