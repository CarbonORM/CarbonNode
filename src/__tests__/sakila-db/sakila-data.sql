--
-- Dumping data for table `binary_test`
--

LOCK TABLES `binary_test` WRITE;
INSERT INTO `binary_test` (`id`, `bin_col`) VALUES
(1, UNHEX('0123456789abcdef0123456789abcdef'));
UNLOCK TABLES;
