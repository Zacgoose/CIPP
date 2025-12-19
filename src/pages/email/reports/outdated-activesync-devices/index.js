import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { CippTablePage } from "/src/components/CippComponents/CippTablePage.jsx";

const Page = () => {
  const offCanvas = {
    extendedInfoFields: [
      "userDisplayName",
      "userPrincipalName",
      "deviceId",
      "deviceModel",
      "clientType",
      "clientVersion",
      "deviceOS",
      "deviceFriendlyName",
      "firstSyncTime",
      "lastSuccessSync",
    ],
  };

  return (
    <CippTablePage
      title="Outdated ActiveSync Devices"
      apiUrl="/api/ListOutdatedActiveSyncDevices"
      offCanvas={offCanvas}
      simpleColumns={[
        "userDisplayName",
        "userPrincipalName",
        "deviceId",
        "deviceModel",
        "clientType",
        "clientVersion",
        "deviceOS",
        "deviceFriendlyName",
        "firstSyncTime",
        "lastSuccessSync",
      ]}
    />
  );
};

Page.getLayout = (page) => <DashboardLayout allTenantsSupport={false}>{page}</DashboardLayout>;

export default Page;
