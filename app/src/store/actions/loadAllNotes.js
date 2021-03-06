import { getAuthHeader } from "../../firebase.js";
import { oof } from "simpler-fetch";

import { errorHandlingWrapper } from "../utils.js";

/**
 * Vuex action to load all notes from API, reset vuex notes to be what the API returned.
 *
 * Only used on login or when first joining an organization where all notes are pulled,
 * instead of pulling all the events and applying them 1 by 1.
 * This helps to speed up processes where there are thousands of changes/events vs hundreds of actual records.
 *
 * This vuex action is in its own module so that it can be lazily loaded,
 * as it is not always used, other than on login and first joining an organization.
 */
export default errorHandlingWrapper(async function loadAllNotes({
  state,
  commit,
}) {
  const res = await oof
    .GET(`/note/all/${state.org}`)
    .header(await getAuthHeader())
    .runJSON();

  if (!res.ok) throw new Error(res.error);

  commit("setNotes", res.notes);

  // Update last sync time only after events are ran so in case it crashes, the events can be re-ran
  commit("setLastSync", res.time);
});
