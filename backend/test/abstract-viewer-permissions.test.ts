import assert from "node:assert/strict";
import test from "node:test";
import { getPermissionsForRole, roleHasPermission } from "../src/config/permissions";

test("abstract viewers can only read abstracts and their advisory analysis", () => {
  assert.deepEqual(getPermissionsForRole("ABSTRACT_VIEWER"), ["abstracts.read"]);
  assert.equal(roleHasPermission("ABSTRACT_VIEWER", "abstracts.review"), false);
  assert.equal(roleHasPermission("ABSTRACT_VIEWER", "users.manage"), false);
  assert.equal(roleHasPermission("ABSTRACT_VIEWER", "payments.read"), false);
});
