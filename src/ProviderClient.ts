export interface Account {
  id: string;
  name: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Device {
  id: string;
  manufacturer: string;
  ownerId: string;
}

export default class ProviderClient {
  public fetchAccountDetails(): Account {
    return {
      id: "account-a",
      name: "Account A",
    };
  }

  public fetchDevices(): Device[] {
    return [
      {
        id: "device-a",
        manufacturer: "Manufacturer A",
        ownerId: "user-a",
      },
      {
        id: "device-b",
        manufacturer: "Manufacturer B",
        ownerId: "user-b",
      },
    ];
  }

  public fetchUsers(): User[] {
    return [
      {
        firstName: "User",
        id: "user-a",
        lastName: "A",
      },
      {
        firstName: "User",
        id: "user-b",
        lastName: "B",
      },
    ];
  }
}
