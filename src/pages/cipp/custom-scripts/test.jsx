import { Layout as DashboardLayout } from "../../../layouts/index.js";
import { useForm, useFormState } from "react-hook-form";
import { ApiPostCall, ApiGetCall } from "../../../api/ApiCall";
import { useRouter } from "next/router";
import {
  Button,
  Stack,
  CardContent,
  CardActions,
  Alert,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useState } from "react";
import CippPageCard from "../../../components/CippCards/CippPageCard";
import { CippApiResults } from "../../../components/CippComponents/CippApiResults";
import CippFormComponent from "../../../components/CippComponents/CippFormComponent";
import { CippFormTenantSelector } from "../../../components/CippComponents/CippFormTenantSelector";
import { CippCodeBlock } from "../../../components/CippComponents/CippCodeBlock";
import { useSettings } from "../../../hooks/use-settings";

const Page = () => {
  const router = useRouter();
  const settings = useSettings();
  const currentTenant = router.query.tenantFilter || settings?.currentTenant;
  const { ScriptGuid } = router.query;
  const [testResults, setTestResults] = useState(null);

  const formControl = useForm({
    mode: "onChange",
    defaultValues: {
      TenantFilter: [],
      Parameters: "",
    },
  });

  const formState = useFormState({ control: formControl.control });

  const scriptDetails = ApiGetCall({
    url: `/api/ListCustomScripts?ScriptGuid=${ScriptGuid}`,
    queryKey: `CustomScript-${ScriptGuid}`,
    waiting: !!ScriptGuid,
  });

  const testScriptApi = ApiPostCall({
    urlFromData: true,
    onResult: (result) => {
      setTestResults(result);
    },
  });

  const handleTest = (data) => {
    let parsedParams = {};
    if (data.Parameters) {
      try {
        parsedParams = JSON.parse(data.Parameters);
      } catch (e) {
        const sanitizedError = String(e.message || "Unknown error").replace(/[<>]/g, "");
        formControl.setError("Parameters", {
          type: "manual",
          message: `Parameters must be valid JSON: ${sanitizedError}`,
        });
        return;
      }
    }

    const payload = {
      ScriptGuid: ScriptGuid,
      TenantFilter: currentTenant,
      Parameters: parsedParams,
    };

    testScriptApi.mutate({
      url: "/api/ExecCustomScript",
      data: payload,
    });
  };

  const formFields = [
    {
      name: "Parameters",
      label: "Script Parameters (JSON)",
      type: "textField",
      required: false,
      multiline: true,
      rows: 5,
      placeholder: `{
  "DaysThreshold": 30,
  "ExcludeDisabled": true
}`,
    },
  ];

  return (
    <CippPageCard
      title="Test Custom Script"
      backButtonTitle="Custom Scripts"
      noTenantInHead={true}
    >
      <CardContent>
        {scriptDetails.isSuccess && scriptDetails.data && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Script Name:</strong> {scriptDetails.data[0].ScriptName}
            </Typography>
            <Typography variant="body2">
              <strong>Description:</strong> {scriptDetails.data[0].Description}
            </Typography>
            <Typography variant="body2">
              <strong>Version:</strong> {scriptDetails.data[0].Version}
            </Typography>
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <CippFormTenantSelector
            formControl={formControl}
            name="TenantFilter"
            label="Select Tenant"
            required={true}
            allTenants={false}
            preselectedEnabled={true}
          />
        </Box>

        <Stack spacing={3}>
          {formFields.map((field, index) => (
            <CippFormComponent key={index} formControl={formControl} {...field} />
          ))}
        </Stack>

        {testScriptApi.isPending && (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2">Running script test...</Typography>
          </Box>
        )}

        {testScriptApi.isError && (
          <Box sx={{ mt: 2 }}>
            <CippApiResults apiObject={testScriptApi} errorsOnly={true} />
          </Box>
        )}

        {testResults?.Results && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            <CippCodeBlock
              code={JSON.stringify(testResults.Results, null, 2)}
              language="json"
              showLineNumbers={false}
            />
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={formControl.handleSubmit(handleTest)}
            disabled={testScriptApi.isPending || !formState.isValid}
          >
            Run Test
          </Button>
        </Stack>
      </CardActions>
    </CippPageCard>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
