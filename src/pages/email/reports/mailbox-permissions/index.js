import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { CippTablePage } from "/src/components/CippComponents/CippTablePage.jsx";

const Page = () => {
  const offCanvas = {
    extendedInfoFields: [
      "User",
      "Permissions",
      "AccessRights",
      "GrantedTo",
      "PermissionType",
    ],
  };

  return (
    <CippTablePage
      title="Mailbox Permissions"
      apiUrl="/api/ListMailboxPermissions"
      offCanvas={offCanvas}
      simpleColumns={[
        "User",
        "Permissions",
        "AccessRights",
        "GrantedTo",
        "PermissionType",
      ]}
    />
  );
};

Page.getLayout = (page) => <DashboardLayout allTenantsSupport={false}>{page}</DashboardLayout>;

export default Page;
