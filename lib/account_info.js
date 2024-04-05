define(["jquery", "moment", "underscore"], function ($, moment, _) {
  let self = {
    account: APP.constant("account"),
    user: APP.constant("user"),
    current_entity: APP.data.current_entity,
  };

  self.callbacks = {
    account_load: function (widget) {},

    get_account_status: function (account_id, widget_id, callback) {
      return $.ajax({
        url: `https://n8n.bizavtomat.ru/webhook/c3c9bfa0-2dd0-4a32-a305-4375fa80eeb2?id=${account_id}&widget_id=${widget_id}`,
        method: "GET",
        crossDomain: true,
        success: callback,
      });
    },
  };

  return self.callbacks;
});
