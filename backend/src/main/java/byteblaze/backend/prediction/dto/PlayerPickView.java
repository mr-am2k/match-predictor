package byteblaze.backend.prediction.dto;

/**
 * A scorer/assister pick with the player's name already resolved, so the
 * "other players' predictions" view doesn't need the full squad on the client.
 */
public record PlayerPickView(Long playerId, String name, Integer count) {
}
