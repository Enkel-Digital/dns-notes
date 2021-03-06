/**
 * CRUD API for organization management
 * Mounted on /org
 * @author JJ
 * @module Organization management APIs
 */

import express from "express";
import unixseconds from "unixseconds";
import { asyncWrap } from "express-error-middlewares";
import { authz as authzMW } from "firebase-auth-express-middleware";
import { fs } from "@enkeldigital/firebase-admin";

const router = express.Router();

/**
 * API to create a new organization
 * @name POST /org/create
 */
router.post(
  "/org/create",

  // Ensure user does not already have an organization
  authzMW((token) => token.org === undefined),

  // Only parse request body if user authorized to access API
  express.json(),

  asyncWrap(async (req, res) => {
    // @todo Check that orgID is valid, e.g. no space
    // @todo Add type definition to the request body object

    // Check to ensure org ID is available
    const snapshot = await fs
      .collection("orgs")
      .where("ID", "==", req.body.org)
      .get();
    if (!snapshot.empty) return res.status(400).json({ error: "Org ID taken" });

    // Create a record of the new org in the database
    await fs.collection("orgs").add({
      ID: req.body.org,
      name: req.body.name,

      createdBy: req.authenticatedUser.email,
      time: unixseconds(),
    });

    // Set claims for user account
    const claims = require("../utils/claims.js");
    claims.setClaims({
      org: req.body.org,

      // The first user / the user that created the org is automatically an admin
      admin: true,
    })(req.authenticatedUser.uid);

    return res.status(200).json({});
  })
);

module.exports = router;
