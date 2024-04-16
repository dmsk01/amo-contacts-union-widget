define(["moment", "underscore", "./account_info.js"], function (
  moment,
  _,
  account_info
) {
  return function ( widget) {
    return new Promise(function (resolve) {
      account_info.get_account_status(
        widget.get_settings().widget_code,
        function (data) {
          if(!data) return;
          
          const { renewal_date } = data;
          window.momentjs = moment;
          const best_before_date_str = renewal_date;

          const today = moment();

          const best_before_date = moment(best_before_date_str, "DD.MM.YYYY");

          const days_difference = today.diff(best_before_date, "days");

          const is_usable = days_difference <= 0;

          data.is_usable = is_usable;

          resolve(data);
        }
      );
    });
  };
});
