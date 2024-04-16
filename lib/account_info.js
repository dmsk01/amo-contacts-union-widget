define(["jquery", "moment", "underscore"], function ($, moment, _) {
  let self = {
    account: APP.constant("account"),
    user: APP.constant("user"),
    current_entity: APP.data.current_entity,
  };

  self.callbacks = {
    get_account_status: function (widget_id, callback) {
      return $.ajax({
        url: `https://n8n.bizavtomat.ru/webhook/c3c9bfa0-2dd0-4a32-a305-4375fa80eeb2?account_id=${self.account.id}&widget_id=${widget_id}`,
        method: "GET",
        crossDomain: true,
        success: callback,
        error: function (jqXHR, exception) {
          let msg = "";
          if (jqXHR.status === 0) {
            msg = "Not connect.\n Verify Network.";
          } else if (jqXHR.status == 404) {
            msg = "Requested page not found. [404]";
          } else if (jqXHR.status == 500) {
            msg = "Internal Server Error [500].";
          } else if (exception === "parsererror") {
            msg = "Requested JSON parse failed.";
          } else if (exception === "timeout") {
            msg = "Time out error.";
          } else if (exception === "abort") {
            msg = "Ajax request aborted.";
          } else {
            msg = "Uncaught Error.\n" + jqXHR.responseText;
          }
          console.error(msg);
        },
      });
    },
    change_account_search_mode: function (widget_id, mode, callback) {
      return $.ajax({
        url: `https://n8n.bizavtomat.ru/webhook/ef61c7b2-9173-4230-9a0e-68fb5537f65d?account_id=${self.account.id}&widget_id=${widget_id}&settings_pipeline=${mode}`,
        method: "PATCH",
        crossDomain: true,
        success: callback,
      });
    },
    save_info: function (data) {
      const { widget_id, phone, domain } = data;
      return $.ajax({
        url: `https://n8n.bizavtomat.ru/webhook/c3c9bfa0-2dd0-4a32-a305-4375fa80eeb2?account_id=${
          self.account.id
        }&widget_id=${widget_id}&contacts_name=${
          self.user.name
        }&phone=${phone}&email=${
          self.user.login
        }&url=https://${domain}&users_number=${
          Object.keys(self.account.users).length
        }`,
        method: "POST",
        crossDomain: true,
      });
    },
  };

  return self.callbacks;
});
