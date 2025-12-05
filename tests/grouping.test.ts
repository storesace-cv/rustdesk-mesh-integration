import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupDevices, parseNotesToGrouping } from "../src/lib/grouping";

describe("parseNotesToGrouping", () => {
  it("routes empty and null notes to Dispositivos por Adotar", () => {
    const emptyResult = parseNotesToGrouping("");
    const nullResult = parseNotesToGrouping(null);

    assert.equal(emptyResult.group, "Dispositivos por Adotar");
    assert.equal(nullResult.group, "Dispositivos por Adotar");
    assert.equal(emptyResult.subgroup, "");
    assert.equal(nullResult.subgroup, "");
  });

  it("extracts group and subgroup when present", () => {
    const parsed = parseNotesToGrouping("Grupo A | Sub A | Comentário extra");

    assert.equal(parsed.group, "Grupo A");
    assert.equal(parsed.subgroup, "Sub A");
  });
});

describe("groupDevices", () => {
  it("places devices with missing notes into Dispositivos por Adotar", () => {
    const grouped = groupDevices([
      { id: "1", device_id: "dev-1", owner: "u1", notes: null },
      { id: "2", device_id: "dev-2", owner: "u1", notes: "" },
    ]);

    assert.ok(grouped["Dispositivos por Adotar"]);
    assert.equal(grouped["Dispositivos por Adotar"][""][0].device_id, "dev-1");
    assert.equal(grouped["Dispositivos por Adotar"][""][1].device_id, "dev-2");
  });

  it("uses backend-provided grouping when available", () => {
    const grouped = groupDevices([
      {
        id: "1",
        device_id: "dev-1",
        owner: "u1",
        notes: "",
        group_name: "Backend Group",
        subgroup_name: "Backend Sub",
      },
    ]);

    assert.ok(grouped["Backend Group"]);
    assert.ok(grouped["Backend Group"]["Backend Sub"]);
  });
});
