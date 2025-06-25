import { Stack, Alert, Box, Typography } from "@mui/material";
import CippWizardStepButtons from "./CippWizardStepButtons";
import { Grid } from "@mui/system";
import CippFormComponent from "../CippComponents/CippFormComponent";
import { getCippValidator } from "../../utils/get-cipp-validator";
import { CippFormCondition } from "../CippComponents/CippFormCondition";
import CippPermissionPreview from "../CippComponents/CippPermissionPreview";
import { useWatch } from "react-hook-form";
import { CippPropertyListCard } from "../CippCards/CippPropertyListCard";

export const CippWizardAppApproval = (props) => {
  const { postUrl, formControl, onPreviousStep, onNextStep, currentStep } = props;

  // Watch for the selected template to access permissions
  const selectedTemplate = useWatch({
    control: formControl.control,
    name: "selectedTemplate",
  });

  // Watch for config mode to show different sections
  const configMode = useWatch({
    control: formControl.control,
    name: "configMode",
  });

  return (
    <Stack spacing={2}>
      {/* Mode Selector */}
      <CippFormComponent
        type="radio"
        name="configMode"
        label="Application Configuration Mode"
        defaultValue="template" // Add default value
        options={[
          { value: "template", label: "Use App Approval Template" },
          { value: "manual", label: "Manual Configuration" },
        ]}
        formControl={formControl}
      />

      {/* Template Mode */}
      <CippFormCondition
        field="configMode"
        compareType="is"
        compareValue="template"
        formControl={formControl}
      >
        <Stack spacing={2}>
          <Alert severity="info">
            Select an app approval template to deploy. Templates contain predefined permissions and admin roles that
            will be applied to the application.
          </Alert>
          <CippFormComponent
            type="autoComplete"
            name="selectedTemplate"
            label="Select App Template"
            api={{
              url: "/api/ListAppApprovalTemplates",
              queryKey: "appApprovalTemplates",
              labelField: (item) => `${item.TemplateName}`,
              valueField: "TemplateId",
              addedField: {
                AppId: "AppId",
                AppName: "AppName",
                PermissionSetId: "PermissionSetId",
                PermissionSetName: "PermissionSetName",
                Permissions: "Permissions",
                AdminRoles: "AdminRoles",
              },
              showRefresh: true,
            }}
            validators={{ required: "A template is required" }}
            formControl={formControl}
            multiple={false}
          />

          {selectedTemplate?.addedFields?.AppName && (
            <Stack spacing={2}>
              <CippPropertyListCard
                variant="outlined"
                showDivider={false}
                propertyItems={[
                  { label: "App Name", value: selectedTemplate.addedFields.AppName },
                  { label: "App ID", value: selectedTemplate.addedFields.AppId },
                  {
                    label: "Permission Set",
                    value: selectedTemplate.addedFields.PermissionSetName || "None",
                  },
                  {
                    label: "Admin Roles",
                    value: selectedTemplate.addedFields.AdminRoles?.length > 0 
                      ? `${selectedTemplate.addedFields.AdminRoles.length} role(s): ${selectedTemplate.addedFields.AdminRoles.map(r => r.displayName).join(', ')}`
                      : "None",
                  },
                ]}
                title="Template Details"
              />
              {selectedTemplate.addedFields.Permissions && (
                <CippPermissionPreview
                  permissions={selectedTemplate.addedFields.Permissions}
                  title="Template API Permissions"
                  maxHeight={400}
                  showAppIds={true}
                />
              )}
              {selectedTemplate.addedFields.AdminRoles?.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Template Admin Roles
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTemplate.addedFields.AdminRoles.map((role) => (
                      <Alert key={role.id} severity="info" sx={{ py: 1 }}>
                        <Typography variant="subtitle2">{role.displayName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {role.description || "Azure AD administrative role"}
                        </Typography>
                      </Alert>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </CippFormCondition>

      {/* Manual Mode */}
      <CippFormCondition
        field="configMode"
        compareType="is"
        compareValue="manual"
        formControl={formControl}
      >
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <CippFormComponent
                type="textField"
                label="Application ID"
                validators={{
                  validate: (value) => getCippValidator(value, "guid"),
                }}
                name="AppId"
                formControl={formControl}
              />
            </Grid>
          </Grid>

          <CippFormComponent
            type="switch"
            label="Copy permissions from the existing application. This app must have been added to the partner tenant first."
            name="CopyPermissions"
            formControl={formControl}
          />

          <CippFormCondition
            field="CopyPermissions"
            compareType="is"
            compareValue={false}
            formControl={formControl}
          >
            <Stack spacing={3}>
              <Alert severity="info">
                Configure API permissions and admin roles manually. The admin roles will be configured 
                during the tenant selection step using the integrated permission builder.
              </Alert>
              
              <CippFormComponent
                type="cippDataTable"
                name="permissions"
                title="API Permissions"
                label="Select your API permissions"
                queryKey="GraphpermissionsList"
                api={{ url: "/permissionsList.json" }}
                simpleColumns={["displayName", "description"]}
                formControl={formControl}
              />

              <Alert severity="info">
                Admin role assignments will be configured in the next step along with tenant selection.
              </Alert>
            </Stack>
          </CippFormCondition>
        </Stack>
      </CippFormCondition>

      <CippWizardStepButtons
        postUrl={postUrl}
        currentStep={currentStep}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
        formControl={formControl}
      />
    </Stack>
  );
};
