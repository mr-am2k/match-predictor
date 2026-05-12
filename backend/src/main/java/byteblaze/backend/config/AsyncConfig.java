package byteblaze.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Small explicit {@code TaskExecutor} for {@code @Async} methods (e.g. the
 * bootstrap-on-league-creation listener). Keeps async behaviour predictable
 * rather than relying on Spring Boot's default executor.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        final ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();

        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(4);
        ex.setQueueCapacity(10);
        ex.setThreadNamePrefix("async-");
        ex.initialize();

        return ex;
    }
}
