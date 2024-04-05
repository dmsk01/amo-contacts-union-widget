define([
  "jquery",
  "underscore",
  "./lib/widget_status.js",
], function ($, _, widget_status) {
  let CustomWidget = function () {
    let self = this;

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
    console.log("Self ", self.get_settings(), self);

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
        console.error("Error saving user search mode ", error);
      }
    };

    this.render_notification = function () {
      if ($(".contact-leads-block").length) {
        return;
      }

      const search_mode = this.get_search_mode();
      const current_card_pipeline_id =
        AMOCRM.constant("card_element").pipeline_id;

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
            )}" target="_blank">${contact.name} (${contact.count})</a>`;
          }
        }

        const imbox = $(".inbox-messaging-card-holder--header");

        if (!html_contacts || $(".contact-leads-card").length) {
          return;
        }
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
          let is_closed = is_lead_closed(
            AMOCRM.constant("card_element").status
          );

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
                console.log("data from jquery after parse", data);
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
        .catch(console.log);
    };

    self.create_widget_settings = function () {
      const title = `<h2 style="margin-bottom: 2rem">${
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

      const select_wrapper = document.createElement("div");
      select_wrapper.style.margin = "20px 0";
      select_wrapper.innerHTML = title + select;

      $(".widget_settings_block__descr").after(select_wrapper);

      $(".bizavdev-select-wrapper").on(
        "controls:change",
        "input",
        function (e) {
          const $input = $(e.currentTarget);
          const selected_value = $input.val();

          self.set_search_mode(selected_value);
        }
      );
    };

    self.create_activation_form = function () {
      // const dto = {
      //   id: APP.constant('account').id,
      //   widget_id: self.get_settings().widget_code,
      //   contacts_name: self.get_settings().user_name,
      //   phone: self.get_settings().phone,
      //   email:
      // }
      console.log(self.get_settings());
      window.myself = self;
      console.log(self);
    };

    this.callbacks = {
      render: function () {
        return true;
      },
      init: _.bind(function () {
        widget_status(APP.constant("account").id, self).then((data) => {
          if (data.is_usable && APP.isCard()) {
            self.render_notification();
          }
          console.log("Data from then ", data);
        });

        let current_user_mode = this.get_search_mode();
        if (!current_user_mode) {
          this.set_search_mode("0");
        }

        // APP.addNotificationCallback(
        //   self.get_settings().widget_code,
        //   function (data) {
        //     console.log(self.get_settings());
        //     console.log("APP.addNotificationCallback data ", data);
        //   }
        // );

        return true;
      }, this),
      bind_actions: function () {
        console.log("bind_actions");
        return true;
      },
      settings: function ($settings_body, context) {
        self.create_activation_form();
        self.create_widget_settings();
        return true;
      },
      onSave: function () {
        console.log("saved");
        return true;
      },
      destroy: function () {},
      contacts: {
        selected: function () {
          console.log("contacts");
        },
      },
      leads: {
        selected: function () {
          console.log("leads");
        },
      },
      tasks: {
        selected: function () {
          console.log("tasks");
        },
      },
      advancedSettings: _.bind(function () {}, self),
      onSalesbotDesignerSave: function (handler_code, params) {
        console.log("onSalesbotDesignerSave", handler_code, params);
      },
    };
    return this;
  };

  return CustomWidget;
});
