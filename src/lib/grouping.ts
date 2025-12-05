export type GroupableDevice = {
  id: string;
  device_id: string;
  owner: string;
  notes: string | null;
  group_name?: string | null;
  subgroup_name?: string | null;
};

export type GroupedDevices = {
  [group: string]: {
    [subgroup: string]: GroupableDevice[];
  };
};

export function parseNotesToGrouping(
  notes: string | null | undefined,
): { group: string; subgroup: string } {
  const trimmed = (notes ?? "").trim();
  if (!trimmed) {
    return { group: "Dispositivos por Adotar", subgroup: "" };
  }

  const parts = trimmed
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  const group = parts[0] ?? "Dispositivos por Adotar";
  const subgroup = parts[1] ?? "";

  return { group, subgroup };
}

function resolveGroupingFromDevice(device: GroupableDevice): {
  group: string;
  subgroup: string;
} {
  const backendGroup = device.group_name?.trim();
  const backendSubgroup = device.subgroup_name?.trim();
  const parsed = parseNotesToGrouping(device.notes);

  const group = backendGroup && backendGroup.length > 0
    ? backendGroup
    : parsed.group;
  const subgroup = backendSubgroup && backendSubgroup.length > 0
    ? backendSubgroup
    : parsed.subgroup;

  return { group, subgroup };
}

export function groupDevices(devices: GroupableDevice[]): GroupedDevices {
  const result: GroupedDevices = {};

  for (const device of devices) {
    const { group, subgroup } = resolveGroupingFromDevice(device);

    if (!result[group]) result[group] = {};
    if (!result[group][subgroup]) result[group][subgroup] = [];
    result[group][subgroup].push(device);
  }

  return result;
}
