<?php

/**
 * Sitemap generator.
 */
function generate_sitemap() {
  global $language, $pages, $the_page_url;
  $sitemap_code = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
  $sitemap_code .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' . PHP_EOL;
  foreach ($pages as $lang => $page) {
    // adjust language part for url
    if ($lang == $language['default']) {
      $lang = '';
    } else {
      $lang = $lang . '/';
    }
    foreach ($page as $slug => $pagedetails) {
      // skip if sitemaps has been disabled for this page
      if (isset($page[$slug]['sitemap']) and !$page[$slug]['sitemap']) continue;
      // skip if the page redirects
      if (isset($page[$slug]['redirect']) and $page[$slug]['redirect'] != '') continue;   
      // adjust slug
      if ($slug == 'main') {
        $slug = '';
      } else {
        $slug = $slug . '/';
      }
      // create <url> part
      $sitemap_code .= '<url>' . PHP_EOL . '<loc>' . $the_page_url . $lang . $slug . '</loc>' . PHP_EOL . '</url>' . PHP_EOL;
    }
  }
  $sitemap_code .= '</urlset>';
  return $sitemap_code;
}


?>