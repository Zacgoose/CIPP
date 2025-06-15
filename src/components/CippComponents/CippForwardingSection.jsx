import { useEffect } from "react";
import { Stack, Button } from "@mui/material";
import CippFormComponent from "./CippFormComponent";
import { CippFormCondition } from "./CippFormCondition";
import { Grid } from "@mui/system";
import { CippApiResults } from "./CippApiResults";

const CippForwardingSection = ({ formControl, usersList, postRequest, handleSubmit, currentSettings }) => {
  
  // Set forwarding defaults based on current settings
  useEffect(() => {
    if (currentSettings && usersList?.data?.Results) {
      // Use top-level data if available, otherwise fall back to mailbox data
      const forwardingAddress = currentSettings.ForwardingAddress || currentSettings?.Mailbox?.[0]?.ForwardingAddress;
      const forwardAndDeliver = currentSettings.ForwardAndDeliver !== undefined 
        ? currentSettings.ForwardAndDeliver 
        : currentSettings?.Mailbox?.[0]?.DeliverToMailboxAndForward;
      
      let forwardingType = "disabled";
      let cleanAddress = "";
      
      if (forwardingAddress) {
        cleanAddress = forwardingAddress.startsWith("smtp:") 
          ? forwardingAddress.replace("smtp:", "") 
          : forwardingAddress;
        
        // Check if address matches any internal user
        const matchedUser = usersList.data.Results.find(user => 
          user.id === cleanAddress || 
          user.userPrincipalName === cleanAddress ||
          user.mail === cleanAddress
        );
        
        if (matchedUser) {
          forwardingType = "internalAddress";
          cleanAddress = matchedUser.userPrincipalName;
        } else {
          forwardingType = "ExternalAddress";
        }
      }
      
      // Set form values
      formControl.setValue("forwarding.forwardOption", forwardingType);
      formControl.setValue("forwarding.KeepCopy", forwardAndDeliver === true);
      
      if (forwardingType === "internalAddress") {
        formControl.setValue("forwarding.ForwardInternal", cleanAddress);
        formControl.setValue("forwarding.ForwardExternal", "");
      } else if (forwardingType === "ExternalAddress") {
        formControl.setValue("forwarding.ForwardExternal", cleanAddress);
        formControl.setValue("forwarding.ForwardInternal", "");
      } else {
        formControl.setValue("forwarding.ForwardInternal", "");
        formControl.setValue("forwarding.ForwardExternal", "");
      }
    }
  }, [currentSettings, usersList, formControl]);

  return (
    <Stack spacing={2}>
      <CippFormComponent
        type="radio"
        name="forwarding.forwardOption"
        formControl={formControl}
        options={[
          { label: "Forward to Internal Address", value: "internalAddress" },
          {
            label: "Forward to External Address (Tenant must allow this)",
            value: "ExternalAddress",
          },
          { label: "Disable Email Forwarding", value: "disabled" },
        ]}
      />

      <CippFormCondition
        formControl={formControl}
        field="forwarding.forwardOption"
        compareType="is"
        compareValue="internalAddress"
      >
        <CippFormComponent
          type="autoComplete"
          label="Select User"
          name="forwarding.ForwardInternal"
          multiple={false}
          options={
            usersList?.data?.Results?.map((user) => ({
              value: user.userPrincipalName,
              label: `${user.displayName} (${user.userPrincipalName})`,
            })) || []
          }
          formControl={formControl}
        />
      </CippFormCondition>

      <CippFormCondition
        formControl={formControl}
        field="forwarding.forwardOption"
        compareType="is"
        compareValue="ExternalAddress"
      >
        <CippFormComponent
          type="textField"
          label="External Email Address"
          name="forwarding.ForwardExternal"
          formControl={formControl}
        />
      </CippFormCondition>

      <CippFormComponent
        type="switch"
        label="Keep a Copy of the Forwarded Mail in the Source Mailbox"
        name="forwarding.KeepCopy"
        formControl={formControl}
      />
      
      <Grid item size={12}>
        <CippApiResults apiObject={postRequest} />
      </Grid>
      
      <Grid>
        <Button
          onClick={() => handleSubmit("forwarding")}
          variant="contained"
          disabled={!formControl.formState.isValid || postRequest.isPending}
        >
          Submit
        </Button>
      </Grid>
    </Stack>
  );
};

export default CippForwardingSection;
