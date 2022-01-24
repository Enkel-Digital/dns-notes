import { createStore } from "vuex";
import { oof } from "simpler-fetch";

export default createStore({
  state() {
    return {
      // Shared global loading flag to show/hide loader in App.vue
      loading: false,

      notes: [
        {
          provider: "cloudflare",
          domain: "covid.gov.sg",
          type: "CNAME",
          name: "_lnslgknlsfIOH_lsndlgdsl",
          value: "",
          note: "Domain verification for Emails",
        },
        {
          provider: "route53",
          domain: "redeem.gov.sg",
          type: "CNAME",
          name: "_23ikef_lsndlgdsl",
          value: "",
          note: "Domain verification for Emails",
        },
      ],
    };
  },

  mutations: {
    // Mutation to update the shared global loading state
    loading: (state, loadingState) => (state.loading = loadingState),

    // Generic mutation to set anything in state
    setter: (state, payload) => (state[payload[0]] = payload[1]),

    setAvailableDates: (state, dates) => state.datesAvailable.push(...dates),
  },

  actions: {
    async loadDates({ commit, dispatch }, after) {
      const res = await oof
        .GET(
          after
            ? `/appointment/available/date?after=${after}`
            : "/appointment/available/date"
        )
        .header({})
        .runJSON();

      // If the API call failed, recursively dispatch itself again if user wants to retry,
      // And always make sure that this method call ends right here by putting it in a return expression
      if (!res.ok)
        return (
          confirm(`Error: \n${res.error}\n\nTry again?`) &&
          dispatch("loadDates", after)
        );

      if (res.timeslots.length === 0)
        return alert("Sorry but there are no more available dates!");

      commit("setAvailableDates", res.timeslots);
    },

    async book({ commit, dispatch, state }) {
      try {
        const res = await oof
          .POST("/appointment/book")
          .header({})
          .data({
            time: state.selectedTimeslot,
            src: state.src,

            // Add in these fields to submit
            // fname / lname / number / email / preference / referralCode
            ...state.details,
          })
          .runJSON();

        // If the API call failed, recursively dispatch itself again if user wants to retry,
        // And always make sure that this method call ends right here by putting it in a return expression
        if (!res.ok)
          return (
            confirm(`Error: \n${res.error}\n\nTry again?`) && dispatch("book")
          );

        commit("setter", ["appointmentID", res.appointmentID]);

        // Return true to indicate that appointment was successfully booked
        return true;
      } catch (error) {
        // For errors that cause API call itself to throw
        console.error(error);

        // If the API call failed, recursively dispatch itself again if user wants to retry,
        // And always make sure that this method call ends right here by putting it in a return expression
        return (
          confirm(`Error: \n${error.message}\n\nTry again?`) && dispatch("book")
        );
      }
    },

    async reschedule({ commit, dispatch, state }) {
      try {
        const res = await oof
          .POST(`/appointment/reschedule/${state.appointmentID}`)
          .header({})
          .data({ time: state.selectedTimeslot })
          .runJSON();

        // If the API call failed, recursively dispatch itself again if user wants to retry,
        // And always make sure that this method call ends right here by putting it in a return expression
        if (!res.ok)
          return (
            confirm(`Error: \n${res.error}\n\nTry again?`) &&
            dispatch("reschedule")
          );
      } catch (error) {
        // For errors that cause API call itself to throw
        console.error(error);

        // If the API call failed, recursively dispatch itself again if user wants to retry,
        // And always make sure that this method call ends right here by putting it in a return expression
        return (
          confirm(`Error: \n${error.message}\n\nTry again?`) &&
          dispatch("reschedule")
        );
      }
    },

    async cancel({ dispatch }, appointmentID) {
      const res = await oof
        .POST(`/appointment/cancel/${appointmentID}`)
        .header({})
        .runJSON();

      // If the API call failed, recursively dispatch itself again if user wants to retry,
      // And always make sure that this method call ends right here by putting it in a return expression
      if (!res.ok)
        return (
          confirm(`Error: \n${res.error}\n\nTry again?`) &&
          dispatch("cancel", appointmentID)
        );
    },
  },
});
