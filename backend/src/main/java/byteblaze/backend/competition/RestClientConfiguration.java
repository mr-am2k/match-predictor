package byteblaze.backend.competition;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@Slf4j
public class RestClientConfiguration {
    private static final String API_KEY_HEADER = "x-apisports-key";

    private final String baseUrl;
    private final String apiKey;

    public RestClientConfiguration(
            @Value("${api.football.base-url}") String baseUrl,
            @Value("${api.football.api-key:NOT_SET}") String apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    };

    @Bean
    public RestClient restClientExternalApi() {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(API_KEY_HEADER, apiKey)
                .build();
    }
}
