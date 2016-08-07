import proto from "../proto";

import * as CFG from "../../cfg";

/**
 * @param {Object} obj
 * @return {Object}
 */
export default function DownloadSettings(obj) {

  return (
    new proto.Networking.Responses.DownloadSettingsResponse({
      hash: "54b359c97e46900f87211ef6e6dd0b7f2a3ea1f5",
      settings: new proto.Settings.GlobalSettings({
        fort_settings: new proto.Settings.FortSettings({
          interaction_range_meters: 40,
          max_total_deployed_pokemon: 10,
          max_player_deployed_pokemon: 1,
          deploy_stamina_multiplier: 500,
          far_interaction_range_meters: 1000
        }),
        map_settings: new proto.Settings.MapSettings({
          pokemon_visible_range: 70,
          poke_nav_range_meters: 201,
          encounter_range_meters: 50,
          get_map_objects_min_refresh_seconds: 5,
          get_map_objects_max_refresh_seconds: 30,
          get_map_objects_min_distance_meters: 10,
          google_maps_api_key: "AIzaSyDF9rkP8lhcddBtvH9gVFzjnNo13WtmJIM"
        }),
        inventory_settings: new proto.Settings.InventorySettings({
          max_pokemon: 1000,
          max_bag_items: 1000,
          base_pokemon: 250,
          base_bag_items: 350,
          base_eggs: 1000
        }),
        minimum_client_version: CFG.MINIMUM_CLIENT_VERSION
      })
    }).encode()
  );

}
