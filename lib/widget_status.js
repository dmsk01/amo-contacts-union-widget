define(["moment", "underscore", "./account_info.js"], function (
  moment,
  _,
  acc_info
) {
  return function (account_id, widget) {
    return new Promise(function (resolve) {
      acc_info.get_account_status(
        account_id,
        widget.get_settings().widget_code,
        function (data) {
          const { renewal_date } = data;
          window.momentjs = moment;
          const best_before_date_str = renewal_date;

          const today = moment();

          const best_before_date = moment(best_before_date_str, "DD.MM.YYYY");

          const days_difference = today.diff(best_before_date, "days");

          const is_usable = days_difference <= 0;

          data.is_usable = is_usable;

          if (!is_usable) {
            AMOCRM.notifications.add_error({
              header: widget.langs.widget.name,
              text: "Истек период пользования виджета.",
              link: "/settings/widgets/#" + widget.get_settings().widget_code,
            });
          }

          resolve(data);
        }
      );
    });
  };
});
