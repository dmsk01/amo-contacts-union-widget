define(["jquery", "underscore", "twigjs"], function ($, _, Twig) {
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

    this.SEARCH_MODE_SETTINGS_KEY = "search_mode";
    this.SEARCH_MODES_MAP = {
      all_funnels: "all_funnels",
      current_funnel: "current_funnel",
    };

    this.get_search_mode = function () {
      return (
        localStorage.getItem(this.SEARCH_MODE_SETTINGS_KEY) ||
        this.SEARCH_MODES_MAP.all_funnels
      );
    };

    this.save_search_mode = function (mode) {
      if (!mode || !mode in this.SEARCH_MODES_MAP) return;
      try {
        localStorage.setItem(
          this.SEARCH_MODE_SETTINGS_KEY,
          this.SEARCH_MODES_MAP[mode]
        );
      } catch (error) {
        console.error("Error saving user search mode ", error);
      }
    };

    this.render_notification = function () {
      if ($(".contact-leads-block").length) {
        return;
      }

      let search_mode = this.get_search_mode();
      let current_card_pipeline_id =
        AMOCRM.constant("card_element").pipeline_id;

      const filter_search_pipelines = (pipelines_array) => {
        return pipelines_array.filter((pipeline) => {
          return search_mode === this.SEARCH_MODES_MAP.all_funnels
            ? pipeline
            : pipeline.id === current_card_pipeline_id;
        });
      };

      let url;

      const generate_html = (isWide, html_contacts) => {
        const base = "background-color: #90e8f0; font-size: 13px; ";
        const html_styles_wide =
          base + "padding:10px 30px; margin: 10px -30px;";
        const html_styles_narrow =
          base + "padding:10px;margin: 10px; max-width: 280px;";
        const styles = isWide ? html_styles_wide : html_styles_narrow;

        const res = `<div class="bizavdev-contact-leads-card" style='${styles}'>
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
            html_contacts +=
              '<a style="color: #313942;" href="' +
              url.substring(5) +
              '" target="_blank">' +
              contact.name +
              " (" +
              contact.count +
              ")</a>";
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
            let filterPipe = "filter[pipe][" + pipeline_item.id + "][]=";

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

    this.callbacks = {
      render: function () {
        console.log("render");
        return true;
      },
      init: _.bind(function () {
        let current_user_mode = this.get_search_mode();
        if (!current_user_mode) {
          this.save_search_mode(this.SEARCH_MODES_MAP.all_funnels);
        }

        if (APP.isCard()) {
          self.render_notification();
        }

        APP.addNotificationCallback(
          self.get_settings().widget_code,
          function (data) {
            console.log(self.get_settings());
            console.log("APP.addNotificationCallback data ", data);
          }
        );

        return true;
      }, this),
      bind_actions: function () {
        console.log("bind_actions");
        return true;
      },
      settings: function () {
        return true;
      },
      onSave: function () {
        alert("click");
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
      advancedSettings: _.bind(function () {
        let $work_area = $("#work-area-" + self.get_settings().widget_code);

        console.log("advancedSettings", self.get_settings());

        const save_button = self.render(
          { ref: "/tmpl/controls/button.twig" },
          {
            text: self.i18n("advanced").save_message,
          }
        );

        const select = self.render(
          { ref: "/tmpl/controls/select.twig" },
          {
            name: "bizavdev_search_range",
            class_name: "bizavdev-select-wrapper",
            items: [
              {
                id: "all_funnels",
                option: self.i18n("advanced").select_option_1,
              },
              {
                id: "current_funnel",
                option: self.i18n("advanced").select_option_2,
              },
            ],
            selected: this.get_search_mode(),
          }
        );

        const title = `<h2 style="margin-bottom: 2rem">${
          self.i18n("advanced").select_message
        }</h2>`;

        $work_area.append(title, select);

        $(".bizavdev-select-wrapper").on(
          "controls:change",
          "input",
          function (e) {
            const $input = $(e.currentTarget);
            const selected_value = $input.val();

            self.save_search_mode(selected_value);
          }
        );

        // const $button = $(".button-input");

        // $button.on("click", () => {
        //   const range_type = $(".bizavdev_search_range").val();
        //   console.log(range_type);
        // });
      }, self),
      onSalesbotDesignerSave: function (handler_code, params) {
        var salesbot_source = {
            question: [],
            require: [],
          },
          button_caption = params.button_caption || "",
          button_title = params.button_title || "",
          text = params.text || "",
          number = params.number || 0,
          handler_template = {
            handler: "show",
            params: {
              type: "buttons",
              value: text + " " + number,
              buttons: [button_title + " " + button_caption],
            },
          };

        console.log(params);

        salesbot_source.question.push(handler_template);

        return JSON.stringify([salesbot_source]);
      },
    };
    return this;
  };

  return CustomWidget;
});
