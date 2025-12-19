import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { CippTablePage } from "/src/components/CippComponents/CippTablePage.jsx";

const Page = () => {
  const columns = [
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
  ];

  const offCanvas = {
    extendedInfoFields: columns,
  };

  return (
    <CippTablePage
      title="Outdated ActiveSync Devices"
      apiUrl="/api/ListOutdatedActiveSyncDevices"
      offCanvas={offCanvas}
      simpleColumns={columns}
    />
  );
};

Page.getLayout = (page) => <DashboardLayout allTenantsSupport={false}>{page}</DashboardLayout>;

export default Page;
