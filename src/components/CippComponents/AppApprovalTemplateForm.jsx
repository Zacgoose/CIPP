import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
  Divider,
} from '@mui/material';
import { CippFormComponent } from '/src/components/CippComponents/CippFormComponent';
import CippAppPermissionBuilder from '/src/components/CippComponents/CippAppPermissionBuilder';
import { ApiGetCall } from '/src/api/ApiCall';

const AppApprovalTemplateForm = ({
  formControl,
  templateData,
  templateLoading,
  isEditing,
  isCopy,
  updatePermissions,
  onSubmit,
  refetchKey
}) => {
  const [initialPermissions, setInitialPermissions] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  // Get all available permission set templates
  const { data: permissionSets, isLoading: permissionSetsLoading } = ApiGetCall({
    url: '/api/ExecAppPermissionTemplate',
    queryKey: 'execAppPermissionTemplate',
  });

  // Get all available app approval templates for importing
  const { data: allTemplates, isLoading: templatesLoading } = ApiGetCall({
    url: '/api/ListAppApprovalTemplates',
    queryKey: 'listAppApprovalTemplates',
  });

  useEffect(() => {
    if (allTemplates && allTemplates.length > 0) {
      setAvailableTemplates(allTemplates);
    }
  }, [allTemplates]);

  useEffect(() => {
    if (!isEditing && !isCopy && !initialPermissions) {
      // Initialize with empty structure for new templates
      setInitialPermissions({
        Permissions: {},
        AdminRoles: [],
        TemplateName: 'New App Approval Template',
      });
      formControl.setValue('templateName', 'New App Approval Template');
    } else if (templateData && (isCopy || isEditing) && !initialPermissions) {
      // For editing or copying
      if (templateData[0]) {
        const templateName = isCopy 
          ? `Copy of ${templateData[0].TemplateName}` 
          : templateData[0].TemplateName;
        
        setInitialPermissions({
          TemplateId: isCopy ? undefined : templateData[0].TemplateId,
          Permissions: templateData[0].Permissions || {},
          AdminRoles: templateData[0].AdminRoles || [],
          TemplateName: templateName,
          AppId: templateData[0].AppId,
          AppName: templateData[0].AppName,
        });
        
        formControl.setValue('templateName', templateName);
        formControl.setValue('appId', templateData[0].AppId || '');
        formControl.setValue('appName', templateData[0].AppName || '');
        
        // Set permission set if it exists
        if (templateData[0].PermissionSetId) {
          formControl.setValue('permissionSet', {
            label: templateData[0].PermissionSetName,
            value: templateData[0].PermissionSetId
          });
        }
      }
    }
  }, [templateData, isCopy, isEditing, formControl]);

  const handleImportTemplate = () => {
    const importTemplate = formControl.getValues('importTemplate');
    if (!importTemplate) return;

    const selectedTemplate = availableTemplates.find((t) => t.TemplateId === importTemplate.value);
    if (selectedTemplate) {
      setInitialPermissions({
        Permissions: selectedTemplate.Permissions || {},
        AdminRoles: selectedTemplate.AdminRoles || [],
        TemplateName: `Import of ${selectedTemplate.TemplateName}`,
        AppId: selectedTemplate.AppId,
        AppName: selectedTemplate.AppName,
      });
      
      formControl.setValue('templateName', `Import of ${selectedTemplate.TemplateName}`);
      formControl.setValue('appId', selectedTemplate.AppId || '');
      formControl.setValue('appName', selectedTemplate.AppName || '');
      
      if (selectedTemplate.PermissionSetId) {
        formControl.setValue('permissionSet', {
          label: selectedTemplate.PermissionSetName,
          value: selectedTemplate.PermissionSetId
        });
      }
    }
  };

  const handleFormSubmit = (permissionData) => {
    const formData = formControl.getValues();
    
    const payload = {
      ...permissionData, // This now includes both Permissions and AdminRoles from the integrated builder
      TemplateName: formData.templateName,
      AppId: formData.appId,
      AppName: formData.appName,
      PermissionSetId: formData.permissionSet?.value,
      PermissionSetName: formData.permissionSet?.label,
    };

    if (isEditing && !isCopy) {
      payload.TemplateId = templateData[0].TemplateId;
    }

    onSubmit(payload);
  };

  return (
    <Stack spacing={3}>
      {templateLoading && (
        <Skeleton variant="rectangular" width="100%" height={200} animation="wave" />
      )}
      
      {!templateLoading && (
        <>
          <Typography variant="body2">
            {isCopy
              ? 'Create a copy of an existing app approval template with your own modifications.'
              : isEditing
              ? 'Edit this app approval template. Changes will affect future deployments.'
              : 'Create a new app approval template to standardize application deployments.'}
          </Typography>

          <Alert severity="info">
            App approval templates combine application registration, permission sets, and admin role 
            assignments for consistent multi-tenant deployments.
          </Alert>

          {/* Basic Template Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Template Information
            </Typography>
            <Stack spacing={2}>
              <CippFormComponent
                formControl={formControl}
                name="templateName"
                label="Template Name"
                type="textField"
                required={true}
                validators={{ required: 'Template name is required' }}
              />

              <CippFormComponent
                formControl={formControl}
                name="appId"
                label="Application ID"
                type="textField"
                required={true}
                validators={{ required: 'Application ID is required' }}
              />

              <CippFormComponent
                formControl={formControl}
                name="appName"
                label="Application Name"
                type="textField"
                required={true}
                validators={{ required: 'Application name is required' }}
              />

              <CippFormComponent
                formControl={formControl}
                name="permissionSet"
                label="Permission Set (Optional)"
                placeholder="Select a permission set to include"
                type="autoComplete"
                options={permissionSets?.map((set) => ({
                  label: set.TemplateName,
                  value: set.TemplateId,
                })) || []}
                isFetching={permissionSetsLoading}
                multiple={false}
              />

              {!isEditing && !isCopy && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <CippFormComponent
                      formControl={formControl}
                      name="importTemplate"
                      label="Import from Existing Template (Optional)"
                      placeholder="Select a template to import"
                      type="autoComplete"
                      options={availableTemplates.map((template) => ({
                        label: template.TemplateName,
                        value: template.TemplateId,
                      }))}
                      isFetching={templatesLoading}
                      multiple={false}
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={handleImportTemplate}
                    disabled={!formControl.watch('importTemplate')}
                  >
                    Import
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>

          <Divider />

          {initialPermissions && (
            <>
              <Alert severity="info">
                Configure the API permissions and admin roles that will be applied when this template is deployed.
                The integrated permission builder allows you to manage both API permissions and admin role assignments in one place.
              </Alert>

              {/* Integrated API Permissions and Admin Roles */}
              <CippAppPermissionBuilder
                formControl={formControl}
                currentPermissions={initialPermissions}
                onSubmit={handleFormSubmit}
                updatePermissions={updatePermissions}
                removePermissionConfirm={true}
                appDisplayName={formControl.watch('templateName') || initialPermissions.TemplateName}
                key={`template-builder-${refetchKey}`}
              />
            </>
          )}
        </>
      )}
    </Stack>
  );
};

export default AppApprovalTemplateForm;
