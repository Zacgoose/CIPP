import { Layout as DashboardLayout } from '../../../layouts/index.js'
import CippWizardPage from '../../../components/CippWizard/CippWizardPage.jsx'
import { CippTenantStep } from '../../../components/CippWizard/CippTenantStep.jsx'
import { CippWizardConfirmation } from '../../../components/CippWizard/CippWizardConfirmation.jsx'
import { CippDmarcConfigStep } from './CippDmarcConfigStep.jsx'

const Page = () => {
  const steps = [
    {
      title: 'Step 1',
      description: 'Select Tenant',
      component: CippTenantStep,
      componentProps: {
        type: 'single',
        valueField: 'defaultDomainName',
      },
    },
    {
      title: 'Step 2',
      description: 'Configure Mailbox',
      component: CippDmarcConfigStep,
      componentProps: {},
    },
    {
      title: 'Step 3',
      description: 'Confirm & Provision',
      component: CippWizardConfirmation,
      componentProps: {},
    },
  ]

  return (
    <CippWizardPage
      steps={steps}
      postUrl="/api/ExecDmarcSetup"
      wizardTitle="DMARC Setup Wizard"
      initialState={{
        Action: 'Provision',
        PostProcessAction: 'Move',
        DisplayName: 'CIPP DMARC Reports',
        MailboxLocalPart: 'dmarc-reports',
      }}
      relatedQueryKeys={['ListDmarcConfig']}
    />
  )
}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default Page
