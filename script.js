define([
  "jquery",
  "underscore",
  "./lib/widget_status.js",
  "./lib/account_info.js",
], function ($, _, widget_status, account_info) {
  let CustomWidget = function () {
    let self = this;
    self.account_id = APP.constant("account").id;

    this.getTemplate = _.bind(function (template, params, callback) {
      params = typeof params == "object" ? params : {};
      template = template || "";

      return this.render(
        {
          href: "/templates/" + template + ".twig",
          base_path: this.params.path,
          v: this.get_version(),
          load: callback,
        },
        params
      );
    }, this);

    this.SEARCH_MODE_SETTINGS_KEY =
      "amo_dd83ldr5ovas6fdp5ynnlfauewyxhbeo6f3nphvd" + "_search_mode";

    this.get_search_mode = function () {
      return localStorage.getItem(this.SEARCH_MODE_SETTINGS_KEY) || "0";
    };

    this.set_search_mode = function (mode) {
      const modes = {
        0: "all_funnels",
        1: "current_funnel",
      };

      if (!mode || !mode in Object.keys(modes)) return;

      try {
        localStorage.setItem(this.SEARCH_MODE_SETTINGS_KEY, mode);
      } catch (error) {
        throw new Error("Error saving user search mode. " + error);
      }
    };

    this.render_notification = function () {
      if ($(".contact-leads-block").length) {
        return;
      }

      const search_mode = this.get_search_mode();
      const current_card_pipeline_id = APP.constant("card_element").pipeline_id;

      const filter_search_pipelines = (pipelines_array) => {
        return pipelines_array.filter((pipeline) => {
          return search_mode === "0"
            ? pipeline
            : pipeline.id === current_card_pipeline_id;
        });
      };

      let url;

      const generate_html = (isWide, html_contacts) => {
        const base =
          "position: relative; border-radius: 10px; background: linear-gradient(90deg, rgba(255,8,134,1) 0%, rgba(32,60,165,1) 41%, rgba(27,52,70,1) 100%); color: white; font-size: 13px; ";
        const html_styles_wide =
          base + "padding:10px 20px; margin: 10px -20px;";
        const html_styles_narrow =
          base + "padding:10px; margin: 10px 15px; max-width: 280px;";
        const styles = isWide ? html_styles_wide : html_styles_narrow;

        const res = `<div class="bizavdev-contact-notification" style='${styles}'>
            <span>
              ${self.langs.widget.user_message}: ${html_contacts}
            </span>
          </div>`;

        return res;
      };

      const process_contact_data = (contactData) => {
        if (!Array.isArray(contactData) || !contactData.length) {
          return;
        }

        let html_contacts = "";
        for (let contact of contactData) {
          if (contact.count > 0) {
            html_contacts += `<a style="color: inherit;" href="${url.substring(
              5
            )}" target="_blank">${contact.name} (${contact.count})</a>, `;
          }
        }

        const imbox = $(".inbox-messaging-card-holder--header");

        if (!html_contacts || $(".contact-leads-card").length) {
          return;
        }
        html_contacts = html_contacts.slice(0, -2);
        if (!imbox.length) {
          $(".linked-form__field_status").before(
            generate_html(true, html_contacts)
          );
        } else {
          $(".inbox-messaging-card-holder--header .linked-form__field_status")
            .not(".inbox-messaging-card-header__status")
            .before(generate_html(true, html_contacts));
          $(
            ".inbox-messaging-card-holder--header .linked-form__field_status.inbox-messaging-card-header__status"
          ).before(generate_html(false, html_contacts));
        }
      };

      const is_lead_closed = (id) => {
        const closed_statuses = [142, 143];
        closed_statuses.includes(id);
      };

      return fetch("/api/v4/leads/pipelines")
        .then((res) => res.json())
        .then(function (data) {
          let filter_data = [];
          let is_closed = is_lead_closed(APP.constant("card_element").status);

          const pipelines = filter_search_pipelines(data._embedded.pipelines);

          for (let pipeline_item of pipelines) {
            let filterPipe = `filter[pipe][${pipeline_item.id}][]=`;

            for (let status of pipeline_item._embedded.statuses) {
              if (!is_lead_closed(status.id)) {
                filter_data.push(filterPipe + status.id);
              }
            }
          }

          filter_data.push("useFilter=y");

          const filter_query = filter_data.join("&");

          const requests = [];
          $("#contacts_list form").each(function () {
            const contact = $(this);
            const name = contact.find(".js-linked-name-view").val();
            const contact_id = contact.find('input[name="ID"]').val();

            url = "/ajax/leads/list/?" + filter_query + "&term=" + contact_id;

            requests.push(
              $.ajax({
                url: url,
                method: "GET",
                headers: { Accept: "application/json" },
                data: filter_data,
              }).then(function (data) {
                data = JSON.parse(data);
                let count =
                  data["response"]["summary"]["count"] - (is_closed ? 0 : 1);

                return {
                  name: name,
                  count: count,
                };
              })
            );
          });

          return Promise.all(requests);
        })
        .then(process_contact_data)
        .catch((err) => {
          throw new Error(err);
        });
    };

    this.remove_spaces = function (str) {
      return str.replace(/[\s-]/g, "").replace(/^[\s-]+|[\s-]+$/g, "");
    };

    self.is_phone_number_valid = function (inputtxt) {
      const phoneno = /^[\s()+-]*([0-9][\s()+-]*){6,20}$/;
      if (phoneno.test(inputtxt)) {
        return true;
      } else {
        return false;
      }
    };

    self.add_error_border = function (
      activation_input,
      save_button,
      condition
    ) {
      if (condition) {
        save_button
          .prop("disabled", false)
          .removeClass("button-input-disabled")
          .addClass("button-input_blue");
        activation_input.prop("style", "outline: 1px solid transparent");
      } else {
        save_button
          .prop("disabled", true)
          .addClass("button-input-disabled")
          .removeClass("button-input_blue");
        activation_input.prop("style", "outline: 1px solid #ff7779");
      }
    };

    self.check_phone_input = function () {
      const activation_input = $(".widget_settings_block input[name=phone]");
      const save_button = $("button.js-widget-save");

      const phone = activation_input.val();

      const is_valid = self.is_phone_number_valid(phone);
      self.add_error_border(activation_input, save_button, is_valid);

      return is_valid;
    };

    self.create_widget_settings = function ($settings_body) {
      const title = `<h2 style="margin-bottom: 0.5rem">${
        self.i18n("advanced").select_message
      }</h2>`;

      const select = self.render(
        { ref: "/tmpl/controls/select.twig" },
        {
          name: "bizavdev_search_range",
          class_name: "bizavdev-select-wrapper",
          items: [
            {
              id: "0",
              option: self.i18n("advanced").select_option_1,
            },
            {
              id: "1",
              option: self.i18n("advanced").select_option_2,
            },
          ],
          selected: this.get_search_mode(),
        }
      );
      const close_button = self.render(
        { ref: "/tmpl/controls/button.twig" },
        {
          name: "close_button",
          text: self.i18n("advanced").save_message,
          blue: true,
        }
      );

      const select_wrapper = document.createElement("div");
      select_wrapper.classList.add("bizavdev_widget_options");
      select_wrapper.style.cssText =
        "margin: 20px 0; display:flex; flex-direction: column; row-gap: 20px; align-items: flex-start; min-width: 215px";
      select_wrapper.innerHTML = title + select + close_button;

      $settings_body.append(select_wrapper);

      $(".bizavdev-select-wrapper").on(
        "controls:change",
        "input",
        function (e) {
          const $input = $(e.currentTarget);
          const selected_value = $input.val();

          account_info.change_account_search_mode(
            self.get_settings().widget_code,
            selected_value,
            self.set_search_mode(selected_value)
          );
        }
      );
      $(".bizavdev_widget_options button.button-input").on(
        "click",
        function () {
          $(
            `.widget-settings__modal.${self.get_settings().widget_code}`
          ).remove();
        }
      );
    };

    self.hide_activatation_setting = function ($settings_body) {
      let widget_settings_block = $settings_body.find(
        ".widget_settings_block__fields"
      );
      widget_settings_block.hide();
    };

    self.activation_form_processing = function () {
      let phone = this.remove_spaces(
        $(".widget_settings_block input[name=phone]").val()
      );
      const user_data = {
        widget_id: self.get_settings().widget_code,
        phone,
        domain: self.system().domain,
      };

      if (user_data) {
        account_info.save_info(user_data).then(() => self.get_widget_status());
      }
    };

    self.get_widget_status = function () {
      widget_status(self).then((data) => {
        self.user_info = data;
        if (data.is_usable && APP.isCard()) {
          self.render_notification();
        }
        this.set_search_mode(data.settings_pipeline);

        if (data !== 404 && !data.is_usable) {
          APP.notifications.add_error({
            header: self.langs.widget.name,
            text: "Истек период пользования виджета. Перейти к оплате",
            link: "/settings/widgets/#" + self.get_settings().widget_code,
          });
        }
      });
    };

    self.create_payment_form = function ($settings_body) {
      const title = `
      <p>${self.i18n("advanced").select_payment_message}
        <a target="_blank"
          href="https://wa.me/79234226700?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!%20%F0%9F%91%8B%20%D0%9C%D0%B5%D0%BD%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D0%B5%D1%82%20%D0%BF%D1%80%D0%BE%D0%B4%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D0%B0%20%D0%B2%20amoCRM"
          style="text-decoration:none; color:#363b44;">WhatsApp </a>
          ${self.i18n("advanced").or_payment_message}
        <a target="_blank" href="https://t.me/bizavr" style="text-decoration:none; color:#363b44;">Telegram </a>
        ${self.i18n("advanced").number_payment_message}
        <a target="_blank" href="tel:+79234226700" style="text-decoration:none; color:#363b44;">+79234226700</a>
      </p>
      <p>${self.i18n("advanced").support_payment_message} <a target="_blank" href="https://t.me/BizavHelp_Bot" style="text-decoration:none; color:#363b44;">@BizavHelp_Bot</a></p>
      `;

      $settings_body.append(title);
    };

    this.callbacks = {
      render: function () {
        return true;
      },
      init: _.bind(function () {
        self.get_widget_status();

        return true;
      }, this),
      bind_actions: function () {
        return true;
      },
      settings: function ($settings_body, context) {
        const activation_input = $(".widget_settings_block input[name=phone]");
        self.check_phone_input();

        ["change", "blur", "focus"].forEach((event) =>
          activation_input.on(event, () => self.check_phone_input())
        );

        if (
          self.user_info &&
          self.user_info !== 404 &&
          !self.user_info.is_usable
        ) {
          $(".bizavdev_widget_options").hide();
          self.create_payment_form($settings_body);
        }

        if (
          !_.isEmpty(self.user_info) ||
          self.get_settings().status !== "not_configured"
        ) {
          self.hide_activatation_setting($settings_body);
        }

        if (
          self.user_info != 404 &&
          !_.isEmpty(self.user_info) &&
          self.get_settings().status === "installed" &&
          self.user_info.is_usable
        ) {
          self.create_widget_settings($settings_body);
        }
        return true;
      },
      onSave: function () {
        if (
          self.check_phone_input() &&
          self.get_settings().status === "not_configured"
        ) {
          self.activation_form_processing();
        }
        return true;
      },
      destroy: function () {},
      contacts: {
        selected: function () {},
      },
      leads: {
        selected: function () {},
      },
      tasks: {
        selected: function () {},
      },
      advancedSettings: _.bind(function () {}, self),
      onSalesbotDesignerSave: function (handler_code, params) {},
    };
    return this;
  };

  return CustomWidget;
});
