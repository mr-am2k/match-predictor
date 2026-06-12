package byteblaze.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

/**
 * Serialize Spring Data {@link org.springframework.data.domain.Page} responses as the
 * stable {@code PagedModel} DTO — {@code { content: [...], page: { size, number,
 * totalElements, totalPages } }} — instead of the legacy flat {@code PageImpl} JSON.
 *
 * <p>The frontend's {@code PageResponse<T>} type expects the nested {@code page} object
 * (browse leagues, standings, admin lists), so this keeps every paged endpoint aligned.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class WebConfig {
}
