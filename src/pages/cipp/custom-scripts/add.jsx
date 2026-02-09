import { Layout as DashboardLayout } from "../../../layouts/index.js";
import { useForm } from "react-hook-form";
import { ApiGetCall } from "../../../api/ApiCall";
import { useRouter } from "next/router";
import { Alert, Typography } from "@mui/material";
import { useEffect } from "react";
import { Stack } from "@mui/system";

import CippFormPage from "../../../components/CippFormPages/CippFormPage";
import CippFormComponent from "../../../components/CippComponents/CippFormComponent";

const Page = () => {
  const router = useRouter();
  const { ScriptGuid } = router.query;
  const isEdit = !!ScriptGuid;

  const formControl = useForm({
    mode: "onChange",
    defaultValues: {
      ScriptName: "",
      ScriptContent: "",
      Description: "",
      Category: { value: "General", label: "General" },
      Risk: { value: "Low", label: "Low" },
    },
  });

  const existingScript = ApiGetCall({
    url: `/api/ListCustomScripts?ScriptGuid=${ScriptGuid}`,
    queryKey: `CustomScript-${ScriptGuid}`,
    waiting: isEdit,
  });

  useEffect(() => {
    if (isEdit && existingScript.isSuccess && existingScript?.data && existingScript.data[0]) {
      const script = existingScript.data[0];
      formControl.reset({
        ScriptName: script.ScriptName || "",
        ScriptContent: script.ScriptContent || "",
        Category: script.Category
          ? { value: script.Category, label: script.Category }
          : { value: "General", label: "General" },
        Description: script.Description || "",
        Risk: script.Risk
          ? { value: script.Risk, label: script.Risk }
          : { value: "Low", label: "Low" },
        ScriptGuid: script.ScriptGuid,
      });
    }
  }, [existingScript.data, isEdit, existingScript.isSuccess, formControl]);

  const customDataformatter = (data) => {
    const payload = {
      ScriptName: data.ScriptName,
      ScriptContent: data.ScriptContent,
      Description: data.Description,
      Category: data.Category?.value,
      Risk: data.Risk?.value,
    };

    if (isEdit) {
      payload.ScriptGuid = ScriptGuid;
    }

    return payload;
  };

  const categoryOptions = [
    { value: "License Management", label: "License Management" },
    { value: "Security", label: "Security" },
    { value: "Compliance", label: "Compliance" },
    { value: "User Management", label: "User Management" },
    { value: "Group Management", label: "Group Management" },
    { value: "Device Management", label: "Device Management" },
    { value: "Guest Management", label: "Guest Management" },
    { value: "General", label: "General" },
  ];

  const riskOptions = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" },
  ];

  const formFields = [
    {
      name: "ScriptName",
      label: "Script Name",
      type: "textField",
      required: true,
      placeholder: "Enter a descriptive name for your script",
      disableVariables: true,
    },
    {
      name: "Description",
      label: "Description",
      type: "textField",
      required: true,
      multiline: true,
      rows: 2,
      placeholder: "Describe what this script checks or monitors",
      disableVariables: true,
    },
    {
      name: "Category",
      label: "Category",
      type: "autoComplete",
      required: false,
      placeholder: "Select or enter a category",
      options: categoryOptions,
      creatable: true,
    },
    {
      name: "Risk",
      label: "Risk Level",
      type: "select",
      required: true,
      placeholder: "Select the risk level for alerts from this script",
      options: riskOptions,
      creatable: false,
    },
    {
      name: "ScriptContent",
      label: "PowerShell Script",
      type: "textField",
      required: true,
      multiline: true,
      rows: 20,
      placeholder: `# Example: Find disabled users with licenses
param($TenantFilter, $DaysThreshold = 30)

$users = New-CIPPDbRequest -TenantFilter $TenantFilter -Type 'Users'
$licensed = $users | Where-Object {
    $_.assignedLicenses.Count -gt 0 -and
    $_.accountEnabled -eq $false
}

# Return results - output is automatically returned
$licensed | ForEach-Object {
    [PSCustomObject]@{
        UserPrincipalName = $_.userPrincipalName
        DisplayName = $_.displayName
        Message = "User has license but is disabled"
    }
}

# Note: Use named parameters in your script.
# $TenantFilter is automatically provided.
# Additional parameters can be defined and passed via the alert configuration.`,
      disableVariables: true,
    },
  ];

  return (
    <CippFormPage
      formControl={formControl}
      queryKey="Custom PowerShell Scripts"
      title="Custom Script"
      backButtonTitle="Custom Scripts"
      formPageType={isEdit ? "Edit" : "Add"}
      postUrl="/api/AddCustomScript"
      customDataformatter={customDataformatter}
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Security Constraints:</strong> Scripts are validated using PowerShell AST
          parsing with an allowlist approach. Only specific commands are permitted (ForEach-Object,
          Where-Object, Select-Object, etc.). The += operator is blocked. All output is
          automatically returned - no explicit return statement needed.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Allowed Data Access:</strong> New-CIPPDbRequest, Get-CIPPDbItem (read-only)
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Tip:</strong> The $TenantFilter parameter is automatically available in your
          script.
        </Typography>
      </Alert>

      <Stack spacing={3}>
        {formFields.map((field, index) => (
          <CippFormComponent key={index} formControl={formControl} {...field} />
        ))}
      </Stack>
    </CippFormPage>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
