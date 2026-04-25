import { Stack, Typography, Alert } from '@mui/material'
import { Grid } from '@mui/system'
import { CippWizardStepButtons } from '../../../components/CippWizard/CippWizardStepButtons'
import { CippFormComponent } from '../../../components/CippComponents/CippFormComponent'
import { CippFormDomainSelector } from '../../../components/CippComponents/CippFormDomainSelector'
import { useWatch } from 'react-hook-form'
import { useEffect } from 'react'

const localPartValidators = {
  required: 'Mailbox username is required.',
  pattern: {
    value: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/,
    message: 'Invalid characters. Do not include the @ or domain.',
  },
  validate: (value) => {
    if (!value) return 'Mailbox username is required.'
    if (value.includes('@'))
      return 'Do not include the @ symbol or domain — select the domain separately.'
    return true
  },
}

export const CippDmarcConfigStep = (props) => {
  const { formControl, currentStep, onPreviousStep, onNextStep } = props

  const tenantFilter = useWatch({ control: formControl.control, name: 'tenantFilter' })
  const selectedDomain = useWatch({ control: formControl.control, name: 'MailboxDomain' })
  const mailboxLocalPart = useWatch({ control: formControl.control, name: 'MailboxLocalPart' })

  const domainValue = selectedDomain?.value || selectedDomain || ''
  const isDefaultDomain = selectedDomain?.addedFields?.isDefault === true
  const localPart = mailboxLocalPart || 'dmarc-reports'
  const fullAddress = domainValue ? `${localPart}@${domainValue}` : ''

  // Keep MailboxAddress in sync with the composed value
  useEffect(() => {
    if (fullAddress) {
      formControl.setValue('MailboxAddress', fullAddress)
    }
  }, [fullAddress, formControl])

  return (
    <Stack spacing={3}>
      <Typography variant="h6">DMARC Mailbox Configuration</Typography>
      <Typography variant="body2" color="text.secondary">
        Configure the shared mailbox that will receive DMARC aggregate reports for this tenant. If
        you already have a DMARC reporting mailbox, enter the local part of that address and select
        its domain. Otherwise, leave the defaults to create a new one.
      </Typography>

      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <CippFormComponent
            type="textField"
            name="MailboxLocalPart"
            label="Mailbox Username"
            formControl={formControl}
            placeholder="dmarc-reports"
            validators={localPartValidators}
            required
          />
        </Grid>
        <Grid size="auto">
          <Typography variant="h5" sx={{ mt: 1 }}>
            @
          </Typography>
        </Grid>
        <Grid size="grow">
          <CippFormDomainSelector
            formControl={formControl}
            name="MailboxDomain"
            label="Domain"
            multiple={false}
            preselectDefaultDomain={true}
            creatable={false}
            validators={{ required: 'Domain is required.' }}
            required
          />
        </Grid>
      </Grid>

      {fullAddress && (
        <Alert severity="info" icon={false}>
          <Typography variant="subtitle2">Mailbox Address</Typography>
          <Typography variant="body1">
            <code>{fullAddress}</code>
          </Typography>
        </Alert>
      )}

      {domainValue && !isDefaultDomain && (
        <Alert severity="warning">
          The selected domain is not the tenant&apos;s default domain. Other domains in this tenant
          will need an External Domain Verification (EDV) TXT record to authorize sending DMARC
          reports to this mailbox. The default domain itself will also need an EDV record since the
          mailbox is not hosted on it. EDV records will be shown after provisioning during DNS
          validation.
        </Alert>
      )}

      {domainValue && isDefaultDomain && (
        <Alert severity="success">
          Using the default domain. Only non-default domains will need EDV TXT records &mdash; the
          default domain does not require one when the mailbox is hosted on it.
        </Alert>
      )}

      <CippFormComponent
        type="textField"
        name="DisplayName"
        label="Mailbox Display Name"
        formControl={formControl}
        placeholder="CIPP DMARC Reports"
        validators={{ required: 'Display name is required.' }}
        required
      />

      <CippFormComponent
        type="select"
        name="PostProcessAction"
        label="After Processing Reports"
        formControl={formControl}
        options={[
          { label: 'Move to DMARC Processed folder', value: 'Move' },
          { label: 'Delete processed emails', value: 'Delete' },
        ]}
        validators={{ required: 'Post-processing action is required.' }}
        required
      />

      <Alert severity="info">
        This will create a shared mailbox in the tenant (no licence required) and configure Exchange
        Online Application RBAC to grant CIPP scoped read access to only this mailbox. No broad
        mail permissions are added to the CIPP app registration.
      </Alert>

      <CippWizardStepButtons
        currentStep={currentStep}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
        formControl={formControl}
      />
    </Stack>
  )
}
